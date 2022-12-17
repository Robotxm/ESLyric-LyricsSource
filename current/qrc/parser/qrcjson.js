import * as decoder from "parser_ext.so"

export function getConfig(cfg) {
    cfg.name = "QRC JSON Parser"
    cfg.version = "0.1"
    cfg.author = "Robotxm"
    cfg.parsePlainText = true
    cfg.fileType = "qrcjson"
}

export function parseLyric(context) {
    const lyricObj = JSON.parse(context.lyricText)

    const plainLyrics = decryptQrc(lyricObj['lyric'])
    const plainTranslation = decryptQrc(lyricObj['trans'])

    const finalLyricText = mergeLyricsAndTranslation(plainLyrics, plainTranslation)

    context.lyricText = finalLyricText
}

function mergeLyricsAndTranslation(lyrics, translation) {
    if (!translation) {
        return lyrics
    }

    const metaInfoRegex = /^\[([^\d:][^:]*):([^:]*)\]\s*$/

    // Step 1: Parse meta info
    let lrcMetaLines = 0
    let hasAddedMetaInfo = false
    let lrcMetaInfo = ""
    const lines = lyrics.split(/[\n\r]/)
    for (const line of lines) {
        // Copy meta tags
        let metaInfoMatches = []
        if (!hasAddedMetaInfo && (metaInfoMatches = metaInfoRegex.exec(line))) {
            lrcMetaInfo += `${metaInfoMatches[0]}\n`
            lrcMetaLines++
        }
    }

    // Step 2: Add translation
    const lrcLines = lyrics.split("\n")
    const translationLines = translation.split("\n")
    let lrcContentWithTranslation = ""
    let translationMetaLines = 0
    for (let translationCurrentLine = 0; translationCurrentLine < translationLines.length; translationCurrentLine++) {
        let currentLineTranslation = translationLines[translationCurrentLine]
        if (metaInfoRegex.test(currentLineTranslation)) {
            translationMetaLines++
            continue
        }

        if (translationLines.length - translationMetaLines > lrcLines.length - lrcMetaLines) {
            console.log(`Lyrics lines: ${lrcLines.length - lrcMetaLines}, translation lines: ${translationLines.length - translationMetaLines}. Too many translation, skip...`)
            return lyrics
        }

        currentLineTranslation = currentLineTranslation.replace(/^\[(\d+):(\d+).(\d+)\]/, '')
        if (currentLineTranslation == '//') {
            currentLineTranslation = '　　'
        }

        const lrcContentCurrentLineIndex = translationCurrentLine - translationMetaLines + lrcMetaLines

        const lrcContentCurrentLine = lrcLines[lrcContentCurrentLineIndex]
        const lrcContentCurrentLineStartTimestamp = lrcContentCurrentLine.substring(1, 9)

        lrcContentWithTranslation += `${lrcContentCurrentLine}\n[${lrcContentCurrentLineStartTimestamp}]` + (currentLineTranslation ?? '　　') + '\n'
    }
    return `${lrcMetaInfo}\n${lrcContentWithTranslation}`
}

function decryptQrc(content) {
    if (!content) {
        return null
    }

    const zippedData = decoder.decodeQrc(restoreQrc(content))
    if (zippedData == null) {
        return
    }

    const unzippedQrcData = zlib.uncompress(zippedData)
    if (unzippedQrcData == null) {
        return
    }

    const decryptedContent = qrcToLrc(arrayBufferToString(unzippedQrcData))
    if (decryptedContent == null) {
        return
    }

    return decryptedContent
}

function escapeXml(xmlText) {
    return xmlText.replace(/&/g, '&amp;')
}

function qrcToLrc(xmlText) {

    if (xmlText != null && typeof xmlText === 'string' && xmlText.indexOf('<?xml') == -1) {
        return xmlText
    }

    let xmlRoot = mxml.loadString(xmlText)
    if (xmlRoot == null) {
        xmlText = escapeXml(xmlText)
        xmlRoot = mxml.loadString(xmlText)
    }
    if (xmlRoot == null) {
        console.log("parse xml failed: " + xmlText)
        return
    }
    let lyricElement = xmlRoot.findElement("Lyric_1", mxml.MXML_DESCEND)
    if (lyricElement == null)
        return null

    let lyricType = lyricElement.getAttr("LyricType")
    if (lyricType == null)
        return null

    if (parseInt(lyricType) != 1) // unsupported type??? not sure
        return null

    let qrcText = lyricElement.getAttr("LyricContent")
    if (qrcText == null)
        return null

    let lyricText = ""
    let matches
    let metaRegex = /^\[(\S+):(\S+)\]$/
    let tsRegex = /^\[(\d+),(\d+)\]/
    let ts2Regex = /([^(^\]]*)\((\d+),(\d+)\)/g
    let lines = qrcText.split(/[\r\n]/)
    for (const line of lines) {
        //console.log(line)
        if (matches = metaRegex.exec(line)) { // meta info
            lyricText += matches[0] + "\r\n"
        } else if (matches = tsRegex.exec(line)) {
            let lyricLine = ""
            let baseTime = parseInt(matches[1])
            let duration = parseInt(matches[2])
            lyricLine += "[" + formatTime(baseTime) + "]"
            lyricLine += "<" + formatTime(baseTime) + ">"
            // parse sub-timestamps
            let subMatches
            while (subMatches = ts2Regex.exec(line)) {
                let startTime = parseInt(subMatches[2])
                let offset = parseInt(subMatches[3])
                let subWord = subMatches[1]
                lyricLine += subWord + "<" + formatTime(startTime + offset) + ">"
            }
            lyricText += lyricLine + "\r\n"
        }
    }

    return lyricText
}

function zpad(n) {
    let s = n.toString()
    return (s.length < 2) ? "0" + s : s
}

function formatTime(time) {
    let t = Math.abs(time / 1000)
    let h = Math.floor(t / 3600)
    t -= h * 3600
    let m = Math.floor(t / 60)
    t -= m * 60
    let s = Math.floor(t)
    let ms = t - s
    let str = (h ? zpad(h) + ":" : "") + zpad(m) + ":" + zpad(s) + "." + zpad(Math.floor(ms * 100))
    return str
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
