/**
 * NetEase Cloud Music Lyrics Searcher Ex
 * Original Author: ohyeah
 * Modified by: Robotxm
 * Version: 0.1
 * License: GPL 3.0
 * Description: Make foobar2000 with ESLyric able to parse lyrics provided by NetEase Cloud Music.
 * Github: https://github.com/Robotxm/ESLyric-LyricsSource
 * 
 * All credits to:
 * https://github.com/Binaryify/NeteaseCloudMusicApi
 * https://github.com/entronad/crypto-es
**/

import crypto from 'crypto-es/lib/index.js'

evalLib('querystring/querystring.min.js')

const linuxApiIv = crypto.enc.Latin1.parse('0102030405060708')
const linuxApiKey = crypto.enc.Latin1.parse('rFgB&h#%2?^eDg:Q')
const eApiKey = crypto.enc.Latin1.parse('e82ckenh8dichen8')

const aesEncrypt = (buffer, mode, key, iv) => {
    const cipher = crypto.AES.encrypt(buffer, key, { mode: mode, iv: iv })
    return cipher.ciphertext
}

const linuxApi = (object) => {
    const text = JSON.stringify(object)
    return {
        eparams: aesEncrypt(crypto.enc.Utf8.parse(text), crypto.mode.ECB, linuxApiKey, linuxApiIv).toString(crypto.enc.Hex).toUpperCase()
    }
}

const eApi = (url, object) => {
    const text = typeof object === 'object' ? JSON.stringify(object) : object
    const message = `nobody${url}use${text}md5forencrypt`
    const digest = crypto.MD5(message).toString()
    const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
    return {
        params: aesEncrypt(crypto.enc.Utf8.parse(data), crypto.mode.ECB, eApiKey, '').toString(crypto.enc.Hex).toUpperCase()
    }
}

const doRequest = (method, url, data, options) => {
    return new Promise((resolve, reject) => {
        let headers = {}
        if (method.toUpperCase() === 'POST')
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        if (url.includes('music.163.com'))
            headers['Referer'] = 'https://music.163.com'
        if (options.crypto === 'linuxapi') {
            data = linuxApi({
                method: method,
                url: url.replace(/\w*api/, 'api'),
                params: data
            })
            headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36'
            url = 'https://music.163.com/api/linux/forward'
        } else if (options.crypto === 'eapi') {
            const cookie = options.cookie || {}
            const csrfToken = cookie['__csrf'] || ''
            const header = {
                osver: cookie.osver,
                deviceId: cookie.deviceId,
                appver: cookie.appver || '8.7.01',
                versioncode: cookie.versioncode || '140',
                mobilename: cookie.mobilename,
                buildver: cookie.buildver || Date.now().toString().substr(0, 10),
                resolution: cookie.resolution || '1920x1080',
                __csrf: csrfToken,
                os: cookie.os || 'android',
                channel: cookie.channel,
                requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
                    .toString()
                    .padStart(4, '0')}`,
            }
            if (cookie.MUSIC_U) header['MUSIC_U'] = cookie.MUSIC_U
            if (cookie.MUSIC_A) header['MUSIC_A'] = cookie.MUSIC_A
            headers['Cookie'] = Object.keys(header)
                .map(
                    (key) =>
                        encodeURIComponent(key) + '=' + encodeURIComponent(header[key]),
                )
                .join('; ')
            data.header = header
            data = eApi(options.url, data)
            url = url.replace(/\w*api/, 'eapi')
        } else {
            reject()
            return
        }
        const settings = {
            method: method,
            url: url,
            headers: headers,
            body: querystring.stringify(data)
        }
        request(settings, (err, res, body) => {
            if (!err && res.statusCode === 200)
                resolve(body)
            else
                reject(err, res)
        })
    }).catch(error => console.log(error.message))
}

const procKeywords = (str) => {
    let s = str
    s = s.toLowerCase()
    s = s.replace(/\'|·|\$|\&|–/g, "")
    //truncate all symbols
    s = s.replace(/\(.*?\)|\[.*?]|{.*?}|（.*?/g, "")
    s = s.replace(/[-/:-@[-`{-~]+/g, "")
    s = s.replace(/[\u2014\u2018\u201c\u2026\u3001\u3002\u300a\u300b\u300e\u300f\u3010\u3011\u30fb\uff01\uff08\uff09\uff0c\uff1a\uff1b\uff1f\uff5e\uffe5]+/g, "")
    return s
}

export function getConfig(config) {
    config.name = "网易云音乐 Ex"
    config.version = "0.1"
    config.author = "Robotxm"
}

export function getLyrics(meta, man) {
    const title = procKeywords(meta.rawTitle)
    const artist = procKeywords(meta.rawArtist)
    const data = {
        s: title + " " + artist,
        type: 1,
        limit: 10,
        offset: 0
    }

    doRequest('POST',
        'https://music.163.com/weapi/search/get',
        data,
        { crypto: 'linuxapi' }
    ).then((body) => {
        let candicates = []
        candicates = parseSearchResults(body)
        for (const item of candicates) {
            const queryData = {
                id: item.id,
                cp: false,
                tv: 0,
                lv: 0,
                rv: 0,
                kv: 0,
                yv: 0,
                ytv: 0,
                yrv: 0,
            }
            // Mobile API whose response may contain yrc (an advanced lyrics format like krc)
            doRequest(
                'POST',
                'https://interface3.music.163.com/eapi/song/lyric/v1',
                queryData,
                {
                    crypto: 'eapi',
                    url: '/api/song/lyric/v1'
                }
            ).then((body) => {
                parseLyricResponse(item, man, body)
            })
        }
    })
    // loop to 'wait' callback(promise)
    messageLoop(0)
}

function parseSearchResults(body) {
    let candicates = []
    try {
        let obj = JSON.parse(body)
        let results = obj['result'] || {}
        let songs = results['songs'] || []
        for (const song of songs) {
            if (typeof (song['id']) === 'undefined' || typeof (song['name']) === 'undefined')
                continue
            let id = song['id']
            let title = song['name']
            let artist = ''
            let artists = song['artists'] || []
            for (const item of artists) {
                if ('name' in item) {
                    artist = item['name']
                    break
                }
            }
            let album = song['album'] || {}
            album = album['name'] || ''
            candicates.push({ id: id, title: title, artist: artist, album: album })
        }
    } catch (e) {
        console.log(e)
    }

    return candicates
}

function parseLyricResponse(item, man, body) {
    try {
        let lyricObj = JSON.parse(body)

        const lyricsMetadata = man.createLyric()

        if (lyricObj['yrc']) {
            lyricsMetadata.title = item.title
            lyricsMetadata.artist = item.artist
            lyricsMetadata.album = item.album
            lyricsMetadata.lyricText = body
            lyricsMetadata.fileType = 'yrc'
            man.addLyric(lyricsMetadata)
        } else {
            let lyricText = ''
            if (lyricObj['lrc']) {
                lyricText = lyricObj['lrc']['lyric']?.replace(/^\{(.*)\}\s*/mg, "")?.trim() ?? ''

                let version = lyricObj['lrc']['version'] || 0
                if (version == 1) return
            }

            // Append translation if exists
            if (lyricObj['tlyric']) {
                lyricText += lyricObj['tlyric']['lyric']?.replace(/^\{(.*)\}\s*/mg, "")?.trim() ?? ''
            }

            lyricsMetadata.title = item.title
            lyricsMetadata.artist = item.artist
            lyricsMetadata.album = item.album
            lyricsMetadata.lyricText = lyricText
            man.addLyric(lyricsMetadata)
        }
    } catch (e) {
        console.log(e)
    }
}
