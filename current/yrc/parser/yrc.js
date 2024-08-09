/**
 * NetEase Cloud Music YRC Lyrics Parser
 * Author: Robotxm
 * Version: 0.2
 * License: GPL 3.0
 * Description: Make foobar2000 with ESLyric able to parse YRC and translated lyrics if exist.
 * Github: https://github.com/Robotxm/ESLyric-LyricsSource
**/

export function getConfig(cfg) {
    cfg.name = "YRC Parser"
    cfg.version = "0.2"
    cfg.author = "Robotxm"
    cfg.parsePlainText = true
    cfg.fileType = "yrc"
}

export function parseLyric(context) {
    context.lyricText = yrcToLrc(context.lyricText)
}

function yrcToLrc(yrcContent) {
    const metaInfoRegex = /^\[([^\d:][^:]*):([^:]*)\]\s*$/gm
    const yrcLineTimestampRegex = /^\[(\d+),(\d+)\]/
    const yrcWordTimestampRegex = /\((\d+),(\d+),(\d+)\)([^\(]*)/g
    const lrcLineTimestampRegex = /^\[(\d+):(\d+).(\d+)\]|^\[(\d+):(\d+)\]/
    const lrcMetaTags = ["ar", "ti", "al", "by"]

    const lyricsObject = JSON.parse(yrcContent)

    /* Start conversion */

    // Step 1: Parse translation
    let yrcTranslation = []
    let yrcTranslationString = lyricsObject?.["ytlrc"]?.["lyric"]
    let hasYRCTranslation = yrcTranslationString != undefined && yrcTranslationString.trim() != ""
    
    let lrcMetaLines = 0
    
    let lrcTranslation = []
    let lrcTranslationString = lyricsObject?.["tlyric"]?.["lyric"]
    let hasLRCTranslation = lrcTranslationString != undefined && lrcTranslationString.trim() != ""

    const translationTimestampRegexA = /^\[(\d+):(\d+).(\d+)\]/
    const translationTimestampRegexB = /^\[(\d+):(\d+)\]/

    if (hasYRCTranslation) {
        yrcTranslation = yrcTranslationString.replace(metaInfoRegex, "").replace("\\n", "\n").trim().split(/[\n\r]/).map(line => {
            const startTimestamp = line.match(translationTimestampRegexA)[0]
            if (startTimestamp) {
                return line.replace(startTimestamp, convertTimestamp(startTimestamp))
            } else {
                return line
            }
        })
    }
    if (hasLRCTranslation) {
        lrcTranslation = lrcTranslationString.replace(metaInfoRegex, "").replace("\\n", "\n").trim().split(/[\n\r]/).map(line => line.replace(translationTimestampRegexA, "").replace(translationTimestampRegexB, ""))
    }

    // Step 2: Parse meta info and convert yrc to advanced lrc
    const containsYRC = lyricsObject?.["yrc"]?.["lyric"] != undefined

    let hasAddedMetaInfo = true // It seems that NetEase Cloud Music has no metadata in lyrics besides [by:] in translation which means the author of lyrics file
    let lrcMetaInfo = ""
    let lrcPlainContent = "" // Plain lrc content without translation
    let lines = containsYRC ? lyricsObject["yrc"]["lyric"].split(/[\n\r]/) : lyricsObject["lrc"]["lyric"].split(/[\n\r]/)
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
            // Process case where 'offset' tags is named as 'manualoffset' in some yrc files
            if (metaInfoMatches[1].endsWith("offset") && lrcMetaInfo.indexOf("[offset:") == -1) {
                lrcMetaInfo += `[offset:${metaInfoMatches[2]}]\n`
                lrcMetaLines++
            }
            lrcPlainContent = lrcMetaInfo
        } else if (lineTimestampMatches = yrcLineTimestampRegex.exec(line)) { // YRC
            hasAddedMetaInfo = true
            let lineStartTime = parseInt(lineTimestampMatches[1], 10)
            let lyricLine = `[${formatTime(lineStartTime)}]`
            // Parse sub-timestamps
            let subMatches = []
            while (subMatches = yrcWordTimestampRegex.exec(line)) {
                let subStartTime = parseInt(subMatches[1], 10) - lineStartTime
                let subDuration = parseInt(subMatches[2], 10)
                let subWord = subMatches[4]
                lyricLine += `<${formatTime(lineStartTime + subStartTime)}>${subWord}<${formatTime(lineStartTime + subStartTime + subDuration)}>`
            }
            lrcPlainContent += `${lyricLine}\n`
        } else if (lineTimestampMatches = lrcLineTimestampRegex.exec(line)) { // Plain LRC
            hasAddedMetaInfo = true
            lrcPlainContent += `${line}\n`
        }
    }

    // Step 3: Add translation if exists
    if (!hasYRCTranslation && !hasLRCTranslation) {
        return lrcPlainContent
    }

    let lrcLines = lrcPlainContent.split("\n")
    let lrcContentWithTranslation = ""

    const tranlationLines = hasYRCTranslation ? yrcTranslation : lrcTranslation

    const translationStartTimestamp = tranlationLines[0]?.slice(0, 11)
    const translationFirstLineIndexInLrcContent = lrcLines.findIndex(line => line.startsWith(translationStartTimestamp))

    for (let lrcCurrentLine = 0; lrcCurrentLine < lrcLines.length; lrcCurrentLine++) {
        const lrcContentCurrentLine = lrcLines[lrcCurrentLine]
        lrcContentWithTranslation += `${lrcContentCurrentLine}\n`

        const expectedTranslationLineIndex = translationFirstLineIndexInLrcContent + lrcCurrentLine
        const expectedTranslationLine = tranlationLines[expectedTranslationLineIndex]
        if (expectedTranslationLine) {
            lrcContentWithTranslation += `${expectedTranslationLine}\n`
        }
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
    const s = Math.floor(t)
    const ms = t - s
    const str = (h ? zpad(h) + ":" : "") + zpad(m) + ":" + zpad(s) + "." + zpad(Math.floor(ms * 100))
    return str
}

/**
 * Convert [xx:xx.xxx] to [xx:xx.xxx]
 */
function convertTimestamp(originalTimestamp) {
    const minutes = parseInt(originalTimestamp.slice(1, 3), 10)
    const seconds = parseInt(originalTimestamp.slice(4, 6), 10)
    const milliseconds = parseInt(originalTimestamp.slice(7, 10), 10)

    return `[${formatTime(minutes * 60 * 1000 + seconds * 1000 + milliseconds)}]`
}
