/**
 * KRC Parser Plus
 * Original Author: ohyeah
 * Modified by: Robotxm
 * Version: 0.1
 * License: GPL 3.0
 * Description: Make foobar2000 with ESLyric able to parse KRC and translated lyrics if exist.
 * Github: https://github.com/Robotxm/ESLyric-LyricsSource
**/

export function getConfig(cfg) {
    cfg.name = "KRC Parser Plus"
    cfg.version = "0.2"
    cfg.author = "Robotxm"
    cfg.parsePlainText = false
    cfg.fileType = "krc"
}

export function parseLyric(context) {
    let zipData = xorKRC(context.lyricData)
    if (!zipData) {
        return
    }
    let unzipData = zlib.uncompress(zipData.buffer)
    if (unzipData == null) {
        return
    }
    context.lyricText = krcToLrc(arrayBufferToString(unzipData))
}

function xorKRC(rawData) {
    if (null == rawData) {
        return
    }

    let dataView = new Uint8Array(rawData)
    let magicBytes = [0x6b, 0x72, 0x63, 0x31] // 'k' , 'r' , 'c' ,'1'
    if (dataView.length < magicBytes.length) {
        return
    }
    for (let i = 0; i < magicBytes.length; ++i) {
        if (dataView[i] != magicBytes[i]) {
            return
        }
    }

    let decryptedData = new Uint8Array(dataView.length - magicBytes.length)
    let encKey = [0x40, 0x47, 0x61, 0x77, 0x5e, 0x32, 0x74, 0x47, 0x51, 0x36, 0x31, 0x2d, 0xce, 0xd2, 0x6e, 0x69]
    let hdrOffset = magicBytes.length
    for (let i = hdrOffset; i < dataView.length; ++i) {
        let x = dataView[i]
        let y = encKey[(i - hdrOffset) % encKey.length]
        decryptedData[i - hdrOffset] = x ^ y
    }

    return decryptedData
}

function krcToLrc(krcContent) {
    const metaInfoRegex = /^\[([^\d:][^:]*):([^:]*)\]\s*$/
    const lineTimestampRegex = /^\[(\d+),(\d+)\]/
    const wordTimestampRegex = /<(\d+),(\d+),(\d+)>([^<]*)/g
    const lrcMetaTags = ["ar", "ti", "al", "by"]

    /* Start conversion */

    // Step 1: Parse translation
    let krcTranslation = []
    let lrcMetaLines = 0
    let hasTranslation = false
    if (krcContent.indexOf("language") != -1 && krcContent.indexOf("eyJjb250ZW50IjpbXSwidmVyc2lvbiI6MX0=") == -1) {
        let translationMatchResult = krcContent.match(/language:(.*)/g)
        let translationJson = atob(translationMatchResult[0].substring(0, translationMatchResult[0].length - 1).replace("language:", ""))
        let translationObject = JSON.parse(translationJson)
        for (let j = 0; j < translationObject.content.length; j++) {
            if (translationObject.content[j].type == 1) {
                hasTranslation = true
                krcTranslation = translationObject.content[j].lyricContent
            }
        }
    }

    // Step 2: Parse meta info and convert krc to advanced lrc
    let hasAddedMetaInfo = false
    let lrcMetaInfo = ""
    let lrcPlainContent = "" // Plain lrc content without translation
    let lines = krcContent.split(/[\n\r]/)
    for (const line of lines) {
        // Copy known meta tag
        let metaInfoMatches = []
        let lineTimestampMatches = []
        if (!hasAddedMetaInfo && (metaInfoMatches = metaInfoRegex.exec(line))) {
            for (const metaTag of lrcMetaTags) {
                if (metaTag == metaInfoMatches[1]) {
                    lrcMetaInfo += `${metaInfoMatches[0]}\n`
                    lrcMetaLines++
                    break
                }
            }
            // Process case where 'offset' tags is named as 'manualoffset' in some krc files
            if (metaInfoMatches[1].endsWith("offset") && lrcMetaInfo.indexOf("[offset:") == -1) {
                lrcMetaInfo += `[offset:${metaInfoMatches[2]}]\n`
                lrcMetaLines++
            }
            lrcPlainContent = lrcMetaInfo
        } else if (lineTimestampMatches = lineTimestampRegex.exec(line)) {
            hasAddedMetaInfo = true
            let lineStartTime = parseInt(lineTimestampMatches[1], 10)
            let lyricLine = `[${formatTime(lineStartTime)}]`
            // Parse sub-timestamps
            let subMatches = []
            while (subMatches = wordTimestampRegex.exec(line)) {
                let subStartTime = parseInt(subMatches[1], 10)
                let subDuration = parseInt(subMatches[2], 10)
                let subWord = subMatches[4]
                lyricLine += `<${formatTime(lineStartTime + subStartTime)}>${subWord}<${formatTime(lineStartTime + subStartTime + subDuration)}>`
            }
            lrcPlainContent += `${lyricLine}\n`
        }
    }

    // Step 3: Add translation if exists
    if (!hasTranslation) {
        return lrcPlainContent
    }

    let lrcLines = lrcPlainContent.split("\n")
    let lrcContentWithTranslation = ""
    for (let translationCurrentLine = 0; translationCurrentLine < krcTranslation.length; translationCurrentLine++) {
        const lrcContentCurrentLineIndex = translationCurrentLine + lrcMetaLines

        const lrcContentCurrentLine = lrcLines[lrcContentCurrentLineIndex]
        const lrcContentCurrentLineStartTimestamp = lrcContentCurrentLine.substring(1, 9)

        let currentLineTranslation = krcTranslation[translationCurrentLine][0]
        if (currentLineTranslation == '//') {
            currentLineTranslation = '　　'
        }

        lrcContentWithTranslation += `${lrcContentCurrentLine}\n[${lrcContentCurrentLineStartTimestamp}]` + (currentLineTranslation ?? "　　") + "\n"
    }
    return `${lrcMetaInfo}\n${lrcContentWithTranslation}`
}

function zpad(n) {
    const s = n.toString()
    return (s.length < 2) ? `0${s}` : s
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
