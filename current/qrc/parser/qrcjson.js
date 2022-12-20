import * as decoder from "parser_ext.so"

export function getConfig(cfg) {
    cfg.name = "QRC JSON Parser"
    cfg.version = "0.2"
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

    const lyricsLines = lyrics.split("\n")
    const translationLines = translation.split("\n")

    const metaInfoRegex = /^\[([^\d:][^:]*):([^:]*)\]\s*$/

    // Step 1: Parse meta info
    let hasAddedMetaInfo = false
    let lrcMetaInfo = ""
    const lines = lyrics.split(/[\n\r]/)
    for (const line of lines) {
        // Copy meta tags
        let metaInfoMatches = []
        if (!hasAddedMetaInfo && (metaInfoMatches = metaInfoRegex.exec(line))) {
            lrcMetaInfo += `${metaInfoMatches[0]}\n`
        }
    }

    // Step 2: Remove all meta info for future use
    let lyricsStartLineIndex = 0
    let translationStartLineIndex = 0
    for (var i = 0; i < 6; i++) {
        if (lyricsLines[i].indexOf("[ti:") >= 0 || lyricsLines[i].indexOf("[ar:") >= 0 || lyricsLines[i].indexOf("[al:") >= 0 || lyricsLines[i].indexOf("[by:") >= 0 || lyricsLines[i].indexOf("[offset:") >= 0 || lyricsLines[i].indexOf("[kana:") >= 0) {
            lyricsStartLineIndex++
        }
        if (translationLines[i].indexOf("[ti:") >= 0 || translationLines[i].indexOf("[ar:") >= 0 || translationLines[i].indexOf("[al:") >= 0 || translationLines[i].indexOf("[by:") >= 0 || translationLines[i].indexOf("[offset:") >= 0 || translationLines[i].indexOf("[kana:") >= 0) {
            translationStartLineIndex++
        }
    }
    lyricsLines.splice(0, lyricsStartLineIndex)
    translationLines.splice(0, translationStartLineIndex)

    // Step 3: Align lyrics and translation
    if (lyricsLines.length != translationLines.length) {
        for (var i = 0; i < lyricsLines.length; i++) {
            if (lyricsLines[i] == null || trim(lyricsLines[i]) == "") {
                lyricsLines.splice(i, 1)
                i = i - 1
            }
            if (translationLines[i] != null) {
                if (trim(lyricsLines[i].substring(10)) == "" && trim(translationLines[i].substring(10)) != "") {
                    lyricsLines.splice(i, 1)
                    i = i - 1
                }
            } else {
                if (trim(lyricsLines[i].substring(10)) == "") {
                    lyricsLines.splice(i, 1)
                    i = i - 1
                }
            }
        }
        for (var i = 0; i < translationLines.length; i++) {
            if (translationLines[i] == null || trim(translationLines[i]) == "") {
                translationLines.splice(i, 1)
                i = i - 1
            }
            if (lyricsLines[i] != null) {
                if (trim(translationLines[i].substring(10)) == "" && trim(lyricsLines[i].substring(10)) != "") {
                    translationLines.splice(i, 1)
                    i = i - 1
                }
            } else {
                if (trim(translationLines[i].substring(10)) == "") {
                    translationLines.splice(i, 1)
                    i = i - 1
                }
            }
        }
    }

    // Step 4: Add translation
    let lrcContentWithTranslation = ""
    for (var i = 0; i < lyricsLines.length; i++) {
        lrcContentWithTranslation += trim(lyricsLines[i]) + "\n"

        const timestamp = lyricsLines[i].substring(0, 10)
        const currentLineTranslation = trim(translationLines[i]).replace("//", "　　")
        lrcContentWithTranslation += timestamp + currentLineTranslation.substring(10, currentLineTranslation.length) + "\n"
    }

    return `${lrcMetaInfo}\n${lrcContentWithTranslation}`
}

function trim(str) {
    return str.replace(/^(\s|\xA0)+|(\s|\xA0)+$/g, '')
        .replace(/&apos;/g, '\'')
        .replace(/&amp;/g, '&')
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
    xmlText = xmlText.replace(/&/g, '&amp;')

    const lyricContentArr = /LyricContent="([(\s\S)]*)"/gm.exec(xmlText)
    if (lyricContentArr && lyricContentArr.length >= 2) {
        const lyricContent = lyricContentArr[1]
        xmlText = xmlText.replace(lyricContent, lyricContent.replace(/\"/g, "&quot;"))
    }

    return xmlText
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
    const metaRegex = /^\[(\S+):(\S+)\]$/
    const tsRegex = /^\[(\d+),(\d+)\]/
    const ts2Regex = /([^(^\]]*)\((\d+),(\d+)\)/g
    const lines = qrcText.split(/[\r\n]/)
    for (const line of lines) {
        //console.log(line)
        if (matches = metaRegex.exec(line)) { // meta info
            lyricText += matches[0] + "\r\n"
        } else if (matches = tsRegex.exec(line)) {
            let lyricLine = ""
            const baseTime = parseInt(matches[1])
            const duration = parseInt(matches[2])
            lyricLine += `[${formatTime(baseTime)}]`
            // parse sub-timestamps
            let subMatches
            while (subMatches = ts2Regex.exec(line)) {
                const startTime = parseInt(subMatches[2])
                const offset = parseInt(subMatches[3])
                const subWord = subMatches[1]
                lyricLine += `<${formatTime(startTime)}>${subWord}<${formatTime(startTime + offset)}>`
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
