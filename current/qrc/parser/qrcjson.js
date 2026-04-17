/**
 * QRCJSON Parser
 * Author: Robotxm
 * Version: 0.3
 * License: GPL 3.0
 * Description: Make foobar2000 with ESLyric able to parse QRC Lyrics from QQMusic.
 * Github: https://github.com/Robotxm/ESLyric-LyricsSource
 * Acknowledgement: https://github.com/chenmozhijin/LDDC
 **/

import { decryptQrc } from "qrc-decryptor/qrc-decryptor.js"

export function getConfig(cfg) {
    cfg.name = "QRC JSON Parser"
    cfg.version = "0.3"
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
    let lrcMetaInfo = ""
    const lines = lyrics.split(/[\n\r]/)
    for (const line of lines) {
        // Copy meta tags
        let metaInfoMatches = []
        if ((metaInfoMatches = metaInfoRegex.exec(line))) {
            lrcMetaInfo += `${metaInfoMatches[0]}\n`
        }
    }

    // Step 2: Remove meta info and parse timestamps for matching
    const lyricEntries = parseTimestampedLines(lyrics, metaInfoRegex)
    const translationEntries = parseTimestampedLines(translation, metaInfoRegex)
    const translationMapping = findClosestMatchQQ(lyricEntries, translationEntries)

    // Step 3: Add translation
    let lrcContentWithTranslation = ""
    for (let i = 0; i < lyricEntries.length; i++) {
        const lyricEntry = lyricEntries[i]
        lrcContentWithTranslation += lyricEntry.raw + "\n"

        const translationIndex = translationMapping[i]
        const translationEntry = translationIndex == null ? null : translationEntries[translationIndex]
        if (!translationEntry || !translationEntry.hasContent) {
            continue
        }

        lrcContentWithTranslation += lyricEntry.timestampText + translationEntry.content + "\n"
    }

    return `${lrcMetaInfo}\n${lrcContentWithTranslation}`
}

function parseTimestampedLines(text, metaInfoRegex) {
    const lineTimestampRegex = /^((?:\[\d{2}:\d{2}\.\d{2}\])+)(.*)$/
    const timestampRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/g
    const entries = []

    for (const rawLine of text.split(/[\n\r]/)) {
        const line = trim(rawLine)
        if (!line || metaInfoRegex.test(line)) {
            continue
        }

        const lineMatch = lineTimestampRegex.exec(line)
        if (!lineMatch) {
            continue
        }

        const timestampMatches = [...lineMatch[1].matchAll(timestampRegex)]
        if (!timestampMatches.length) {
            continue
        }

        const timestampText = timestampMatches[0][0]
        entries.push({
            raw: line,
            timestampText,
            start: timestampToMilliseconds(timestampMatches[0][1], timestampMatches[0][2], timestampMatches[0][3]),
            content: lineMatch[2],
            hasContent: hasLyricContent(lineMatch[2]),
        })
    }

    return entries
}

function timestampToMilliseconds(minutes, seconds, centiseconds) {
    return Number(minutes) * 60000 + Number(seconds) * 1000 + Number(centiseconds) * 10
}

function hasLyricContent(text) {
    const content = trim(String(text || "")).replace(/<\d{2}:\d{2}\.\d{2}>/g, "")
    if (content === "" || content === "//") {
        return false
    }

    return !(content.length === 2 && /[A-Z]/.test(content[0]) && content[1] === "：")
}

function findClosestMatchQQ(lyricsEntries, translationEntries) {
    if (lyricsEntries.length === translationEntries.length && lyricsEntries.every((entry) => entry.hasContent) && translationEntries.every((entry) => entry.hasContent)) {
        return Object.fromEntries(lyricsEntries.map((_, index) => [index, index]))
    }

    const filteredLyrics = lyricsEntries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.hasContent)
    const filteredTranslation = translationEntries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.hasContent)

    if (filteredLyrics.length === filteredTranslation.length) {
        return Object.fromEntries(filteredLyrics.map((item, index) => [item.index, filteredTranslation[index].index]))
    }

    const timeDifferenceList = []
    for (let i = 0; i < filteredLyrics.length; i++) {
        for (let j = 0; j < filteredTranslation.length; j++) {
            timeDifferenceList.push({
                lyricIndex: filteredLyrics[i].index,
                translationIndex: filteredTranslation[j].index,
                diff: Math.abs(filteredLyrics[i].entry.start - filteredTranslation[j].entry.start),
            })
        }
    }

    timeDifferenceList.sort((a, b) => a.diff - b.diff)

    const usedLyrics = new Set()
    const usedTranslation = new Set()
    const mapping = {}
    for (const item of timeDifferenceList) {
        if (usedLyrics.has(item.lyricIndex) || usedTranslation.has(item.translationIndex)) {
            continue
        }

        usedLyrics.add(item.lyricIndex)
        usedTranslation.add(item.translationIndex)
        mapping[item.lyricIndex] = item.translationIndex

        if (usedLyrics.size === lyricsEntries.length || usedTranslation.size === translationEntries.length) {
            break
        }
    }

    return mapping
}

function trim(str) {
    return str.replace(/^(\s|\xA0)+|(\s|\xA0)+$/g, '')
        .replace(/&apos;/g, '\'')
        .replace(/&amp;/g, '&')
}
