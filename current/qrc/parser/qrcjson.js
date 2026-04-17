/**
 * QRCJSON Parser
 * Author: Robotxm
 * Version: 0.3
 * License: GPL 3.0
 * Description: Make foobar2000 with ESLyric able to parse QRC Lyrics from QQMusic.
 * Github: https://github.com/Robotxm/ESLyric-LyricsSource
 * Acknowledgement: https://github.com/chenmozhijin/LDDC
**/

const DECRYPT = 0
const ENCRYPT = 1
const QRC_KEY = createUtf8Bytes("!@#)(*$%123ZXC!@!@#)(NHL")

const SBOX = [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 15, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 10, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
]

const KEY_RND_SHIFT = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
const KEY_PERM_C = [56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35]
const KEY_PERM_D = [62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3]
const KEY_COMPRESSION = [13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31]

function createUtf8Bytes(text) {
    let bytes = []
    for (let i = 0; i < text.length; ++i) {
        const code = text.charCodeAt(i)
        if (code <= 0x7f) {
            bytes.push(code)
        } else if (code <= 0x7ff) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
        } else {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
        }
    }
    return new Uint8Array(bytes)
}

function normalizeHex(hex) {
    return String(hex || "").replace(/\s+/g, "").trim()
}

function bitnum(a, b, c) {
    return ((((a[Math.floor(b / 32) * 4 + 3 - Math.floor((b % 32) / 8)] >> (7 - (b % 8))) & 1) << c) >>> 0)
}

function bitnumIntr(a, b, c) {
    return ((((a >>> (31 - b)) & 1) << c) >>> 0)
}

function bitnumIntl(a, b, c) {
    return ((((a << b) & 0x80000000) >>> c) >>> 0)
}

function sboxBit(a) {
    return ((a & 32) | ((a & 31) >>> 1) | ((a & 1) << 4)) >>> 0
}

function initialPermutation(inputData) {
    let left = 0
    let right = 0

    const leftIndexes = [57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
    const rightIndexes = [56, 48, 40, 32, 24, 16, 8, 0, 58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6]
    for (let i = 0; i < leftIndexes.length; ++i) {
        left |= bitnum(inputData, leftIndexes[i], 31 - i)
        right |= bitnum(inputData, rightIndexes[i], 31 - i)
    }

    return [left >>> 0, right >>> 0]
}

function inversePermutation(s0, s1) {
    const data = new Uint8Array(8)
    data[3] = (bitnumIntr(s1, 7, 7) | bitnumIntr(s0, 7, 6) | bitnumIntr(s1, 15, 5) | bitnumIntr(s0, 15, 4) | bitnumIntr(s1, 23, 3) | bitnumIntr(s0, 23, 2) | bitnumIntr(s1, 31, 1) | bitnumIntr(s0, 31, 0)) & 0xff
    data[2] = (bitnumIntr(s1, 6, 7) | bitnumIntr(s0, 6, 6) | bitnumIntr(s1, 14, 5) | bitnumIntr(s0, 14, 4) | bitnumIntr(s1, 22, 3) | bitnumIntr(s0, 22, 2) | bitnumIntr(s1, 30, 1) | bitnumIntr(s0, 30, 0)) & 0xff
    data[1] = (bitnumIntr(s1, 5, 7) | bitnumIntr(s0, 5, 6) | bitnumIntr(s1, 13, 5) | bitnumIntr(s0, 13, 4) | bitnumIntr(s1, 21, 3) | bitnumIntr(s0, 21, 2) | bitnumIntr(s1, 29, 1) | bitnumIntr(s0, 29, 0)) & 0xff
    data[0] = (bitnumIntr(s1, 4, 7) | bitnumIntr(s0, 4, 6) | bitnumIntr(s1, 12, 5) | bitnumIntr(s0, 12, 4) | bitnumIntr(s1, 20, 3) | bitnumIntr(s0, 20, 2) | bitnumIntr(s1, 28, 1) | bitnumIntr(s0, 28, 0)) & 0xff
    data[7] = (bitnumIntr(s1, 3, 7) | bitnumIntr(s0, 3, 6) | bitnumIntr(s1, 11, 5) | bitnumIntr(s0, 11, 4) | bitnumIntr(s1, 19, 3) | bitnumIntr(s0, 19, 2) | bitnumIntr(s1, 27, 1) | bitnumIntr(s0, 27, 0)) & 0xff
    data[6] = (bitnumIntr(s1, 2, 7) | bitnumIntr(s0, 2, 6) | bitnumIntr(s1, 10, 5) | bitnumIntr(s0, 10, 4) | bitnumIntr(s1, 18, 3) | bitnumIntr(s0, 18, 2) | bitnumIntr(s1, 26, 1) | bitnumIntr(s0, 26, 0)) & 0xff
    data[5] = (bitnumIntr(s1, 1, 7) | bitnumIntr(s0, 1, 6) | bitnumIntr(s1, 9, 5) | bitnumIntr(s0, 9, 4) | bitnumIntr(s1, 17, 3) | bitnumIntr(s0, 17, 2) | bitnumIntr(s1, 25, 1) | bitnumIntr(s0, 25, 0)) & 0xff
    data[4] = (bitnumIntr(s1, 0, 7) | bitnumIntr(s0, 0, 6) | bitnumIntr(s1, 8, 5) | bitnumIntr(s0, 8, 4) | bitnumIntr(s1, 16, 3) | bitnumIntr(s0, 16, 2) | bitnumIntr(s1, 24, 1) | bitnumIntr(s0, 24, 0)) & 0xff
    return data
}

function f(state, key) {
    const t1 = (bitnumIntl(state, 31, 0) | ((state & 0xf0000000) >>> 1) | bitnumIntl(state, 4, 5) | bitnumIntl(state, 3, 6) | ((state & 0x0f000000) >>> 3) | bitnumIntl(state, 8, 11) | bitnumIntl(state, 7, 12) | ((state & 0x00f00000) >>> 5) | bitnumIntl(state, 12, 17) | bitnumIntl(state, 11, 18) | ((state & 0x000f0000) >>> 7) | bitnumIntl(state, 16, 23)) >>> 0
    const t2 = (bitnumIntl(state, 15, 0) | ((state & 0x0000f000) << 15) | bitnumIntl(state, 20, 5) | bitnumIntl(state, 19, 6) | ((state & 0x00000f00) << 13) | bitnumIntl(state, 24, 11) | bitnumIntl(state, 23, 12) | ((state & 0x000000f0) << 11) | bitnumIntl(state, 28, 17) | bitnumIntl(state, 27, 18) | ((state & 0x0000000f) << 9) | bitnumIntl(state, 0, 23)) >>> 0

    const lrgstate = [
        ((t1 >>> 24) & 0xff) ^ key[0],
        ((t1 >>> 16) & 0xff) ^ key[1],
        ((t1 >>> 8) & 0xff) ^ key[2],
        ((t2 >>> 24) & 0xff) ^ key[3],
        ((t2 >>> 16) & 0xff) ^ key[4],
        ((t2 >>> 8) & 0xff) ^ key[5],
    ]

    const mixed = (
        (SBOX[0][sboxBit(lrgstate[0] >>> 2)] << 28) |
        (SBOX[1][sboxBit(((lrgstate[0] & 0x03) << 4) | (lrgstate[1] >>> 4))] << 24) |
        (SBOX[2][sboxBit(((lrgstate[1] & 0x0f) << 2) | (lrgstate[2] >>> 6))] << 20) |
        (SBOX[3][sboxBit(lrgstate[2] & 0x3f)] << 16) |
        (SBOX[4][sboxBit(lrgstate[3] >>> 2)] << 12) |
        (SBOX[5][sboxBit(((lrgstate[3] & 0x03) << 4) | (lrgstate[4] >>> 4))] << 8) |
        (SBOX[6][sboxBit(((lrgstate[4] & 0x0f) << 2) | (lrgstate[5] >>> 6))] << 4) |
        SBOX[7][sboxBit(lrgstate[5] & 0x3f)]
    ) >>> 0

    return (
        bitnumIntl(mixed, 15, 0) | bitnumIntl(mixed, 6, 1) | bitnumIntl(mixed, 19, 2) | bitnumIntl(mixed, 20, 3) |
        bitnumIntl(mixed, 28, 4) | bitnumIntl(mixed, 11, 5) | bitnumIntl(mixed, 27, 6) | bitnumIntl(mixed, 16, 7) |
        bitnumIntl(mixed, 0, 8) | bitnumIntl(mixed, 14, 9) | bitnumIntl(mixed, 22, 10) | bitnumIntl(mixed, 25, 11) |
        bitnumIntl(mixed, 4, 12) | bitnumIntl(mixed, 17, 13) | bitnumIntl(mixed, 30, 14) | bitnumIntl(mixed, 9, 15) |
        bitnumIntl(mixed, 1, 16) | bitnumIntl(mixed, 7, 17) | bitnumIntl(mixed, 23, 18) | bitnumIntl(mixed, 13, 19) |
        bitnumIntl(mixed, 31, 20) | bitnumIntl(mixed, 26, 21) | bitnumIntl(mixed, 2, 22) | bitnumIntl(mixed, 8, 23) |
        bitnumIntl(mixed, 18, 24) | bitnumIntl(mixed, 12, 25) | bitnumIntl(mixed, 29, 26) | bitnumIntl(mixed, 5, 27) |
        bitnumIntl(mixed, 21, 28) | bitnumIntl(mixed, 10, 29) | bitnumIntl(mixed, 3, 30) | bitnumIntl(mixed, 24, 31)
    ) >>> 0
}

function cryptBlock(inputData, key) {
    let state = initialPermutation(inputData)
    let s0 = state[0]
    let s1 = state[1]
    for (let idx = 0; idx < 15; ++idx) {
        const previousS1 = s1
        s1 = (f(s1, key[idx]) ^ s0) >>> 0
        s0 = previousS1 >>> 0
    }
    s0 = (f(s1, key[15]) ^ s0) >>> 0
    return inversePermutation(s0, s1)
}

function keySchedule(key, mode) {
    const schedule = []
    for (let i = 0; i < 16; ++i) {
        schedule.push([0, 0, 0, 0, 0, 0])
    }

    let c = 0
    let d = 0
    for (let i = 0; i < 28; ++i) {
        c |= bitnum(key, KEY_PERM_C[i], 31 - i)
        d |= bitnum(key, KEY_PERM_D[i], 31 - i)
    }

    for (let i = 0; i < 16; ++i) {
        c = (((c << KEY_RND_SHIFT[i]) | (c >>> (28 - KEY_RND_SHIFT[i]))) & 0xfffffff0) >>> 0
        d = (((d << KEY_RND_SHIFT[i]) | (d >>> (28 - KEY_RND_SHIFT[i]))) & 0xfffffff0) >>> 0
        const togen = mode === DECRYPT ? 15 - i : i

        for (let j = 0; j < 24; ++j) {
            schedule[togen][Math.floor(j / 8)] |= bitnumIntr(c, KEY_COMPRESSION[j], 7 - (j % 8))
        }
        for (let j = 24; j < 48; ++j) {
            schedule[togen][Math.floor(j / 8)] |= bitnumIntr(d, KEY_COMPRESSION[j] - 27, 7 - (j % 8))
        }
    }

    return schedule
}

function tripleDesKeySetup(key) {
    return [keySchedule(key.subarray(16, 24), DECRYPT), keySchedule(key.subarray(8, 16), ENCRYPT), keySchedule(key.subarray(0, 8), DECRYPT)]
}

function tripleDesCrypt(data, key) {
    let result = data
    for (let i = 0; i < 3; ++i) {
        result = cryptBlock(result, key[i])
    }
    return result
}

function decodeHexBytes(hex) {
    const normalized = normalizeHex(hex)
    if (!normalized || normalized.length % 16 != 0 || !/^[0-9a-fA-F]+$/.test(normalized)) {
        return null
    }

    const bytes = new Uint8Array(normalized.length / 2)
    for (let i = 0; i < normalized.length; i += 2) {
        bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16)
    }
    return bytes
}

function decryptQrcBytes(content) {
    const encrypted = decodeHexBytes(content)
    if (!encrypted) {
        return null
    }

    const schedule = tripleDesKeySetup(QRC_KEY)
    const decrypted = new Uint8Array(encrypted.length)
    for (let i = 0; i < encrypted.length; i += 8) {
        decrypted.set(tripleDesCrypt(encrypted.subarray(i, i + 8), schedule), i)
    }

    return decrypted.buffer
}

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

function decryptQrc(content) {
    if (!content) {
        return null
    }

    const zippedData = decryptQrcBytes(content)
    if (!zippedData) {
        return
    }

    const unzippedQrcData = zlib.uncompress(zippedData)
    if (!unzippedQrcData) {
        return
    }

    const decryptedContent = qrcToLrc(arrayBufferToString(unzippedQrcData))
    if (!decryptedContent) {
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
    // Some xml texts are missing <?xml ... ?> header, add it back
    if (xmlText && typeof xmlText === 'string' && xmlText.indexOf('<?xml') == -1 && xmlText.startsWith("<QrcInfos>")) {
        xmlText = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlText
    }

    if (xmlText && typeof xmlText === 'string' && xmlText.indexOf('<?xml') == -1) {
        return xmlText
    }

    let xmlRoot = mxml.loadString(xmlText)
    if (!xmlRoot) {
        xmlText = escapeXml(xmlText)
        xmlRoot = mxml.loadString(xmlText)
    }
    if (!xmlRoot) {
        console.log("parse xml failed: " + xmlText)
        return
    }
    const lyricElement = xmlRoot.findElement("Lyric_1", mxml.MXML_DESCEND)
    if (!lyricElement) {
        return null
    }

    const lyricType = lyricElement.getAttr("LyricType")
    if (!lyricType)
        return null

    if (parseInt(lyricType) != 1) { // unsupported type??? not sure
        return null
    }

    const qrcText = lyricElement.getAttr("LyricContent")
    if (!qrcText) {
        return null
    }

    return qrcText
        .replace(/^\[(\d+),(\d+)\]/gm, (_, base, __) => `[${formatTime(+base)}]<${formatTime(+base)}>`)
        .replace(/\((\d+),(\d+)\)/g, (_, start, offset) => `<${formatTime(+start + +offset)}>`)
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
