﻿/**
 * QQMusic Searcher Ex
 * Original Author: ohyeah
 * Modified by: Robotxm
 * Version: 0.2
 * License: GPL 3.0
 * Description: Make foobar2000 with ESLyric able to search QRC Lyrics from QQMusic.
 * Github: https://github.com/Robotxm/ESLyric-LyricsSource
 * Acknowledgement: https://github.com/jsososo/QQMusicApi
                    https://github.com/xmcp/QRCD
**/

export function getConfig(cfg) {
    cfg.name = "QQ 音乐 Ex"
    cfg.version = "0.2"
    cfg.author = "Robotxm"
}

export function getLyrics(meta, man) {

    evalLib("querystring/querystring.min.js")

    // query QRC lyrics
    let url = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_search_pc_lrc.fcg?'
    let data = {
        SONGNAME: meta.title,
        SINGERNAME: meta.artist,
        TYPE: 2,
        RANGE_MIN: 1,
        RANGE_MAX: 20
    }
    url += querystring.stringify(data)

    let headers = {}
    headers['Referer'] = 'https://y.qq.com'

    let settings = {
        method: 'get',
        url: url,
        headers: headers
    }

    let stageSongList = []
    request(settings, (err, res, body) => {
        if (err || res.statusCode != 200) {
            return
        }
        let xmlDoc = mxml.loadString(body)
        let songList = xmlDoc.findElement('songinfo') || []
        // Get singer name from common data
        const songName = decodeURIComponent(xmlDoc.findElement('songname').getFirstChild().getCDATA())
        const singerName = decodeURIComponent(xmlDoc.findElement('singer').getFirstChild().getCDATA())
        for (const song of songList) {
            let id = song.getAttr('id')
            if (id == null) continue
            let title = decodeURIComponent(getChildElementCDATA(song, 'name'))
            if (!title || title.length === 0) {
                title = songName
            }

            let artist = decodeURIComponent(getChildElementCDATA(song, 'singername'))
            if (!artist || artist.length === 0) {
                artist = singerName
            }

            let album = decodeURIComponent(getChildElementCDATA(song, 'albumname'))

            stageSongList.push({ id: id, title: title, artist: artist, album: album })
        }

    })

    if (stageSongList.length > 0) {
        let lyricCount = queryLyricV3(meta, man, stageSongList)
        if (lyricCount == null || lyricCount < 1) {
            queryLyricV2(meta, man, stageSongList)
        }
    }

    // obsolete
    //queryLyric(meta, man)

}

function queryLyricV3(meta, man, songList)
{
    let lyricCount = 0
    let headers = {}
    headers['Referer'] = 'https://y.qq.com'
    headers['Host'] = 'u.y.qq.com'
    // notes: some params may not be required, I'm not tested.
    let postData = {
        comm: {
            _channelid: '0',
            _os_version: '6.2.9200-2',
            authst: '',
            ct: '19',
            cv: '1873',
            //guid: '30D1D7C616938DDB575AF16E56D44BD4',
            patch: '118',
            psrf_access_token_expiresAt: 0,
            psrf_qqaccess_token: '',
            psrf_qqopenid: '',
            psrf_qqunionid: '',
            tmeAppID: 'qqmusic',
            tmeLoginType: 2,
            uin: '0',
            wid: '0'
        },
        'music.musichallSong.PlayLyricInfo.GetPlayLyricInfo': {
            method: 'GetPlayLyricInfo',
            module: 'music.musichallSong.PlayLyricInfo'
        }
    }

    for(const song of songList) {
        let songID = song.id | 0
        postData['music.musichallSong.PlayLyricInfo.GetPlayLyricInfo']['param'] = {
            albumName : btoa(song.album),
            crypt : 1,
            ct : 19,
            cv : 1873,
            interval : meta.duration | 0,
            lrc_t : 0,
            qrc : 1,
            qrc_t : 0,
            roma : 1,
            roma_t : 0,
            singerName : btoa(song.album),
            songID : songID,
            songName : btoa(song.artist),
            trans : 1,
            trans_t : 0,
            type : -1
        }

        let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg?'
        let params = {
            pcachetime: new Date().getTime() | 0
        }
        url += querystring.stringify(params)
        let postDataString = JSON.stringify(postData)
        let settings = {
            method: 'post',
            url: url,
            headers: headers,
            body: postDataString
        }
    
        request(settings, (err, res, body) => {
            if (err || res.statusCode != 200) {
                return
            }
            
            try {
                let obj = JSON.parse(body)
                if (obj['code'] != 0) {
                    return
                }

                let lyricObjRoot = obj['music.musichallSong.PlayLyricInfo.GetPlayLyricInfo']
                if (lyricObjRoot['code'] != 0) {
                    return
                }

                let lyricObj = lyricObjRoot['data']
                if (lyricObj['songID'] != songID) {
                    return
                }

                let lyricMeta = man.createLyric()
                lyricMeta.title = song.title
                lyricMeta.artist = song.artist
                lyricMeta.album = song.album
                lyricMeta.fileType = 'qrcjson'
                lyricMeta.lyricText = JSON.stringify(lyricObj)

                man.addLyric(lyricMeta)
                ++lyricCount

            } catch (e) {
                console.log("[qqmusic_ex] queryLyricV3 request lyric exception: " + e.message)
            }
        })
    }

    return lyricCount
}

function queryLyricV2(meta, man, songList)
{
    let headers = {}
    headers['Referer'] = 'https://y.qq.com'

    for (const song of songList) {
        let url = 'https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg?'
        let data = {
            version: '15',
            miniversion: '82',
            lrctype: '4',
            musicid: song.id,
        }
        url += querystring.stringify(data)

        let settings = {
            method: 'get',
            url: url,
            headers: headers
        }

        request(settings, (err, res, body) => {
            if (err || res.statusCode != 200) {
                return
            }

            body = body.replace('<!--', '').replace('-->', '').replace(/<miniversion.*\/>/, '').trim()
            let xmlRoot = mxml.loadString(body)
            if (xmlRoot != null) {
                let lyricMeta = man.createLyric()
                let lyrics = xmlRoot.findElement('lyric') || []
                for (const lyricEntry of lyrics) {
                    let content = getChildElementCDATA(lyricEntry, 'content')
                    if (content == null) continue
                    let lyricData = restoreQrc(content)
                    if (lyricData == null) continue
                    lyricMeta.title = song.title
                    lyricMeta.artist = song.artist
                    lyricMeta.album = song.album
                    lyricMeta.lyricData = lyricData
                    lyricMeta.fileType = 'qrc'
                    man.addLyric(lyricMeta)
                }
            }
        })
    }
}

function queryLyric(meta, man)
{
    let headers = {}
    headers['Referer'] = 'https://y.qq.com'

    // qury LRC lyrics
    let queryNum = 10
    let url = 'http://c.y.qq.com/soso/fcgi-bin/client_search_cp?'
    let data = {
        format: 'json',
        n: queryNum,
        p: 0,
        w: meta.title + '+' + meta.artist,
        cr: 1,
        g_tk: 5381
    }
    url += querystring.stringify(data)

    let settings = {
        method: 'get',
        url: url,
        headers: headers
    }

    let stageSongList = []
    request(settings, (err, res, body) => {
        console.log("[qqmusic_ex] queryLyrics: " + err + " " + url)
        if (!err && res.statusCode === 200) {
            try {
                let obj = JSON.parse(body)
                let data = obj['data'] || {}
                let song = data['song'] || {}
                let song_list = song['list'] || {}
                for (const song_entry of song_list) {
                    let title = song_entry['songname'] || ''
                    let album = song_entry['albumname'] || ''
                    let artist = ''
                    let artist_list = song_entry['singer'] || []
                    if (artist_list.length > 0) {
                        artist = artist_list[0]['name'] || ''
                    }
                    let songmid = song_entry['songmid'] || ''
                    if (songmid === '') {
                        continue
                    }
                    stageSongList.push({ title: title, album: album, artist: artist, songmid: songmid })
                }
            } catch (e) {
                console.log('[qqmusic_ex] queryLyrics exception: ' + e.message)
            }
        }
    })

    let lyricMeta = man.createLyric()
    for (const result of stageSongList) {
        url = 'http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?'
        data = {
            songmid: result.songmid,
            pcachetime: new Date().getTime(),
            g_tk: 5381,
            loginUin: 0,
            hostUin: 0,
            inCharset: 'utf8',
            outCharset: 'utf-8',
            notice: 0,
            platform: 'yqq',
            needNewCode: 1,
            format: 'json'
        }
        url += querystring.stringify(data)
        settings = {
            method: 'get',
            url: url,
            headers: headers
        }

        request(settings, (err, res, body) => {
            if (!err && res.statusCode === 200) {
                lyricMeta.title = result.title
                lyricMeta.artist = result.artist
                lyricMeta.album = result.album
                try {
                    let obj = JSON.parse(body)
                    let b64lyric = obj['lyric'] || ''
                    let b64tlyric = data['trans'] || ''
                    let lyric = atob(b64lyric)
                    let tlyric = atob(b64tlyric)
                    if (tlyric != '') lyric += tlyric
                    lyricMeta.lyricText = lyric
                    man.addLyric(lyricMeta)
                } catch (e) {
                    console.log('[qqmusic_ex] queryLyrics parse lyric response exception: ' + e.message)
                }
            }
        })
    }
}

function getChildElementCDATA(node, name) {
    let child = node.findElement(name)
    if (child == null) {
        return ''
    }
    let schild = child.getFirstChild()
    if (schild == null) {
        return ''
    }
    return schild.getCDATA() || ''
}

function restoreQrc(hexText) {
    if (hexText.length % 2 != 0) return null

    const sig = "[offset:0]\n"
    let arrBuf = new Uint8Array(hexText.length / 2 + sig.length)
    for (let i = 0; i < sig.length; ++i) {
        arrBuf[i] = sig.charCodeAt(i)
    }

    const offset = sig.length
    for (let i = 0; i < hexText.length; i += 2) {
        arrBuf[offset + i / 2] = parseInt(hexText.slice(i, i + 2), 16)
    }

    return arrBuf.buffer
}
