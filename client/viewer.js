"use strict"
/* global m */

// Processed data to display
let stats_words = null
let users = null
let messages = null

// Which view of: users, search, and messages
let show = "users"

// User table view
let currentUsername = null
let sortUsersBy = "id"
let sortUsersReverse = false
let userResultPage = 0

// Search view
let searchString = ""
let searchStringEdited = ""
let lastSearchString = ""
let searchResult = []
let searchResultPage = 0
let regexError = null

// Messages view
let selectedMessage = null
let messageResultPage = 0

// Words view
let currentWord = null
let sortWordsBy = "alphabetical"
let sortWordsReverse = false
let wordsScrollY = 0
let wordFilter = ""
let wordRegexError = null
let wordsTableHeight = 400
const heightPerItem = 18

const pageSize = 1000

/* Example message:
{
    "id": "550198834c839f3268162e60",
    "sent": "2015-03-12T13:45:39.963Z",
    "username": "StephanHoyer",
    "text": "Hi Leo"
}
*/

/* Example user:
{
    "spacejack": {
        "id": "55edda3f0fc9f982beafee8a",
        "username": "spacejack",
        "displayName": "spacejack",
        "url": "/spacejack",
        "avatarUrl": "https://avatars-01.gitter.im/gh/uv/4/spacejack",
        "avatarUrlSmall": "https://avatars1.githubusercontent.com/u/11592867?v=4&s=60",
        "avatarUrlMedium": "https://avatars1.githubusercontent.com/u/11592867?v=4&s=128",
        "v": 18,
        "gv": "4"
    }
}
v is version of user info
gv is gravatar version (for cache busting)
*/

function saveStateToHash() {
    const hashParams = {}
    Object.assign(hashParams, {
        show,
        currentUsername,
        sortUsersBy,
        sortUsersReverse,
        userResultPage,
        sortWordsBy,
        sortWordsReverse,
        currentWord,
        wordsScrollY,
        wordFilter,
        searchString,
        searchResultPage,
        selectedMessage: selectedMessage ? selectedMessage.id : "",
        messageResultPage,
    })

    const truthyParams = {}
    for (const key of Object.keys(hashParams)) {
        const value = hashParams[key]
        if (value) truthyParams[key] = value
    }

    m.route.set("/", truthyParams)
}

function valueOrDefault(value, theDefault, type) {
    // assume the value if always a string
    if (value) {
        if (type === "number") return parseInt(value)
        // Mithril routing parses true/false strings
        if (type === "boolean") return value
        if (type === "message") {
            // Inefficient to loop every time
            for (let message of messages) {
                if (message.id === value) return message
            }
            return theDefault
        }
        return value
    }
    return theDefault
}

function loadStateFromHash(hashParams) {

    show = valueOrDefault(hashParams.show, "users")
    currentUsername = valueOrDefault(hashParams.currentUsername, "")
    sortUsersBy = valueOrDefault(hashParams.sortUsersBy, "id")
    sortUsersReverse = valueOrDefault(hashParams.sortUsersReverse, false, "boolean")
    userResultPage = valueOrDefault(hashParams.userResultPage, 0, "number")
    sortWordsBy = valueOrDefault(hashParams.sortWordsBy, "alphabetical")
    sortWordsReverse = valueOrDefault(hashParams.sortWordsReverse, false, "boolean")
    currentWord = valueOrDefault(hashParams.currentWord, "")
    wordsScrollY = valueOrDefault(hashParams.wordsScrollY, 0, "number")
    wordFilter = valueOrDefault(hashParams.wordFilter, "")
    searchString = valueOrDefault(hashParams.searchString, "")
    searchResultPage = valueOrDefault(hashParams.searchResultPage, 0, "number")
    selectedMessage = valueOrDefault(hashParams.selectedMessage, null, "message")
    messageResultPage = valueOrDefault(hashParams.messageResultPage, 0, "number")

    // Does not preserve unknown params

    // TODO: determine messageResultPage for a message if the page is not specified

    if (searchString && lastSearchString !== searchString) {
        searchStringEdited = searchString
        search()
    }
}

function jumpToMessage(message) {
    if (selectedMessage === message) {
        selectedMessage = null
        saveStateToHash()
        return
    }
    show = "messages"
    messageResultPage = Math.floor(messages.indexOf(message) / pageSize)
    selectedMessage = message
    saveStateToHash()
}

function jumpToUser(username) {
    show = "users"
    currentUsername = username
    userResultPage = 0
    saveStateToHash()
}

const showHeaders = {}

function rtrim(string) {
    // Trim trailing space from string
    return string.replace(/\s*$/,"")
}

function displayItemContents(message) {
    const body = message.text
    if (!body.startsWith("From ") || !message.title) return body 

    let headers = ""
    let rest = body

    headers = body.split(/\n\s*\n/)[0]
    if (headers.length === body.length) {
        headers = ""
    } else {
        headers = rtrim(headers)
    }
    rest = body.substring(headers.length)

    rest = rest.trim()
    return m("div.ba.bw1.pa1", [
        headers ? [
            m("button.f6.mr1", { onclick: () => showHeaders[message.id] = !showHeaders[message.id] }, "Headers"),
        ] : [],
        showHeaders[message.id] ? m("pre", headers) : [],
        message.title ? m("span.f4", message.title) : [],
        m("pre", rest),
    ])
}

function viewMessagesForList(subset, includeUser) {
    return subset.map(message => m("div.ml3.mt1", 
        { 
            key: message.id,
            oncreate: (selectedMessage === message) ? (vnode) => vnode.dom.scrollIntoView() : undefined
        }, 
        m("span.blue.mr2" + ((selectedMessage === message) ? ".b" : ""), {
            onclick: () => jumpToMessage(message),
        }, message.sent),
        includeUser
            ? [m("span.mr2.i" + ((selectedMessage === message) ? ".b" : ""), {
                onclick: () => jumpToUser(message.username)
            }, message.username)]
            : [],
        m("span.dib", { style: (selectedMessage === message) ? "white-space: pre-wrap" : "" }, 
            (selectedMessage === message) ? displayItemContents(message) : message.title || displayItemContents(message))
    ))
}

// ----------------- users

function viewMessagesForUser(username) {
    const result = []
    for (const message of messages) {
        if (message.username === username) {
            result.push(message)
        }
    }
    return viewPage(result)
}

function usersHeaderClick(field) {
    currentUsername = null
    if (sortUsersBy === field) {
        sortUsersReverse = !sortUsersReverse
    } else {
        sortUsersBy = field
    }
    saveStateToHash()
}

function viewUsers() {
    const sortedUsers = Object.keys(users)
    switch (sortUsersBy) {
    case "id":
        sortedUsers.sort()
        break
    case "name":
        sortedUsers.sort((a, b) => users[a].displayName.localeCompare(users[b].displayName))
        break
    case "rank":
        sortedUsers.sort((a, b) => users[a].rank - users[b].rank)
        break
    case "posts":
        sortedUsers.sort((a, b) => users[a].postCount - users[b].postCount)
        break
    default:
        throw new Error("unexpected username sort case: " + sortUsersBy)
    }
    if (sortUsersReverse) sortedUsers.reverse()
    const table = sortedUsers.map(username => {
        const user = users[username]
        const isSelected = currentUsername === username
        return m("div.ml2",
            {
                key: user.id,
                oncreate: (currentUsername === username) ? (vnode) => vnode.dom.scrollIntoView() : undefined
            },
            m("span" + (isSelected ? ".b" : ""), 
                {
                    onclick: () => {
                        currentUsername === username ? currentUsername = null : currentUsername = username
                        userResultPage = 0
                        saveStateToHash()
                    }
                },
                m("span.dib", { style: "width: 15rem" }, user.username),
                " ",
                m("span.i.dib", { style: "width: 15rem" }, user.displayName),
                " ",
                m("span.dib.w3", user.rank),
                " ",
                m("span.dib.w3", user.postCount)
            ),
            isSelected ? viewMessagesForUser(username) : []
        )
    })
    const sortCharacter = m("span.b", sortUsersReverse ? "▼" : "▲")
    // Thes space between fields are there so if you copy and paste the data it has space seperators for items.
    const header = m("div.ml2", { key: " HEADER " },
        m("span", 
            m("span.dib", { style: "width: 15rem", onclick: () => usersHeaderClick("id") }, "ID", ((sortUsersBy === "id") ? sortCharacter : [])),
            " ",
            m("span.dib", { style: "width: 15rem", onclick: () => usersHeaderClick("name") }, "Name", ((sortUsersBy === "name") ? sortCharacter : [])),
            " ",
            m("span.dib.w3", { onclick: () => usersHeaderClick("rank") }, "Rank", ((sortUsersBy === "rank") ? sortCharacter : [])),
            " ",
            m("span.dib.w3", { onclick: () => usersHeaderClick("posts") }, "# Posts", ((sortUsersBy === "posts") ? sortCharacter : []))
        )
    )
    return [header, table]
}

// ----------------- words

function wordsHeaderClick(field) {
    currentWord = null
    if (sortWordsBy === field) {
        sortWordsReverse = !sortWordsReverse
    } else {
        sortWordsBy = field
    }
    saveStateToHash()
}

function limitLength(word, limit) {
    if (word.length < limit) return word
    return word.substring(0, limit - 3) + "..."
}

let sortedWordsCache = null
let sortedWordsCacheState = {}

function sortWords() {
    // Chaching ptimization so not sorting every redraw
    if (sortedWordsCache
        && sortedWordsCacheState.sortWordsBy === sortWordsBy
        && sortedWordsCacheState.sortWordsReverse === sortWordsReverse
        && sortedWordsCacheState.wordFilter === wordFilter
    ) {
        return sortedWordsCache
    }

    let re
    try {
        re = new RegExp(wordFilter, "i")
    } catch (e) {
        re = null
        wordRegexError = e.message
    }
    sortedWordsCache = re ? stats_words.filter(item => !wordFilter || re.test(item.word)) : []
    switch (sortWordsBy) {
    case "alphabetical":
        sortedWordsCache.sort(sortByWord)
        break
    case "rank":
        sortedWordsCache.sort(sortByFrequencyAndWord)
        break
    case "frequency":
        sortedWordsCache.sort(sortByFrequencyAndWord)
        break
    default:
        throw new Error("unexpected word sort case: " + sortWordsBy)
    }

    if (sortWordsReverse) sortedWordsCache.reverse()

    sortedWordsCacheState = {
        sortWordsBy,
        sortWordsReverse,
        wordFilter
    }
    return sortedWordsCache
}

function viewWords() {
    if (!stats_words) return m("div", "Still processing word statistics -- please wait...")

    const sortedWords = sortWords()

    let visibleItemCount = Math.round(wordsTableHeight / heightPerItem)
    const visibleHeight = visibleItemCount * heightPerItem
    const totalHeight = sortedWords.length * heightPerItem
    let start = Math.round(wordsScrollY / heightPerItem)
    let end = start + visibleItemCount

    /*
    function calculateCurrentWordIndex() {
        if (!currentWord) return 0
        for (let i = 0; i < sortedWords.length; i++) {
            if (sortedWords[i].word === currentWord) return i
        }
        console.log("Word not found", currentWord)
        return 0
    }

    function calculateCurrentWordScrollY() {
        return calculateCurrentWordIndex * heightPerItem
    }
    */

    // Reuse the same DOM nodes as we scroll through the table by using the same index for the same row
    let index = 0
    const table = sortedWords.slice(start, end).map(item => {
        const word = item.word
        const rank = item.rank
        const frequency = item.count
        const isSelected = currentWord === word
        return m("div.ml2",
            {
                style: {
                    height: heightPerItem + "px",
                },
                key: index++,
            },
            m("span" + (isSelected ? ".b" : ""), 
                {
                    onclick: () => {
                        currentWord === word ? currentWord = null : currentWord = word
                        saveStateToHash()
                        if (currentWord) {
                            show = "search"
                            // searchString = "\\W" + word + "\\W"
                            searchString = word.replace(/\+/gi, "\\+")
                            saveStateToHash()
                        }
                        
                    },
                    style: {
                        "white-space": "nowrap"
                    }
                },
                m("span.i.dib", { style: "width: 5rem" }, rank),
                " ",                " ",
                m("span.i.dib", { style: "width: 5rem" }, frequency),
                " ",
                m("span.dib", { style: "width: 32rem" }, limitLength(word, 60)),
            ),
        )
    })
    const sortCharacter = m("span.b", sortWordsReverse ? "▼" : "▲")
    // Thes space between fields are there so if you copy and paste the data it has space seperators for items.
    const header = m("div.ml2.mt1", { key: " HEADER " },
        m("span", 
            {
                style: {
                    "white-space": "nowrap"
                }
            },
            m("span.dib", { style: "width: 5rem", onclick: () => wordsHeaderClick("rank") }, "Rank", ((sortWordsBy === "rank") ? sortCharacter : [])),
            " ",
            m("span.dib", { style: "width: 5rem", onclick: () => wordsHeaderClick("frequency") }, "Count", ((sortWordsBy === "frequency") ? sortCharacter : [])),
            " ",
            m("span.dib", { style: "width: 32rem", onclick: () => wordsHeaderClick("alphabetical") }, "Word", ((sortWordsBy === "alphabetical") ? sortCharacter : [])),
        )
    )

    const wrappedTable = m("div.ba",
        {
            oncreate: (vnode) => {
                vnode.dom.scrollTop = wordsScrollY // calculateCurrentWordScrollY(),
                const rect = vnode.dom.getBoundingClientRect()
                wordsTableHeight = window.innerHeight - rect.top
                // TODO: This needs to be updated on a window resize
                m.redraw()
            },
            id: "wrapped-table",
            style: {
                height: visibleHeight + "px",
                position: "relative",
                "overflow-y": "scroll",
            },
            onscroll: (event) => {
                wordsScrollY = Math.round(event.target.scrollTop)
                const rect = event.target.getBoundingClientRect()
                wordsTableHeight = window.innerHeight - rect.top
            }
        },
        m("div", 
            {
                style: {
                    height: totalHeight + "px",
                }
            },
            m("div",
                {
                    style: {
                        position: "absolute"  ,
                        top: wordsScrollY + "px", 
                    }
                },
                table
            )
        )
    )
    
    return m("div", [
        "Filter (regex, case-insensitive):",
        m("input.ml1", {
            value: wordFilter,
            onchange: (event) => {
                wordFilter = event.target.value
                wordsScrollY = 0
                document.getElementById("wrapped-table").scrollTop = 0 
                saveStateToHash()
            },
        }),
        m("button.ml2", { onclick: () => /* wordFilterButtonClicked() */ {} }, "Filter"),
        m("span.ml2", "# matches: " + sortedWords.length),
        m("br"),
        wordRegexError ? m("div.red", wordRegexError) : [],
        header,
        wrappedTable,
    ])
}

function sortByFrequencyAndWord(a, b) {
    if (a.count !== b.count) return b.count - a.count
    if (a.word < b.word) return -1
    if (a.word > b.word) return 1
    return 0
}

function sortByWord(a, b) {
    if (a.word < b.word) return -1
    if (a.word > b.word) return 1
    return 0
}

const processingPerIteration = 1000
const accumulated_stats = {}
let current_stats_index = "..."

// This function incrementally processes some stats and then schedules itself with timeout
// This is to keep UI responsive during an operation that may take several seconds
function processWordStats(index) {
    current_stats_index = Math.floor((messages.length - index) / processingPerIteration) 

    for (let i = index; (i < messages.length && i < index + processingPerIteration); i++) {
        // Spilt the message into words and add the results to stats
        const message = messages[i]
        // Not removed: - _
        const re = /[\t\n\r(.,/\\#!$%^&*;:{}=`'~()<>?"[\]‘’“”…]/g
        // re = /[^a-z]/g
        const words = message.text.toLowerCase().replace(re, " ").split(/(\s+)/)
        for (let word of words) {
            word = word.trim()
            if (!word) continue
            // Use a prefix w: on the words because the word might be __proto__ or constructor
            word = "w:" + word
            if (!accumulated_stats[word]) accumulated_stats[word] = []
            accumulated_stats[word].push(message)
        }
    }

    if (index + processingPerIteration >= messages.length) {
        const words_table = []
        for (let key in accumulated_stats) {
            // Remove the prefix with substring when storing the actual word
            words_table.push({word: key.substring(2), count: accumulated_stats[key].length, matchingMessages: accumulated_stats[key]})
        }

        words_table.sort(sortByFrequencyAndWord)

        // assign ranks based on frequency
        for (let i = 0; i < words_table.length; i++) {
            words_table[i].rank = i + 1
        }

        stats_words = words_table
        // done
    } else {
        // loop until done
        setTimeout(() => processWordStats(index + processingPerIteration), 0)
    }
    m.redraw()
}

// ----------------- search

function onSearchInputKeyDown(event) {
    if (event.keyCode === 13) {
        event.preventDefault()
        searchStringEdited = event.target.value
        searchButtonClicked()
    } else {
        event.redraw = false
    }
}

function searchButtonClicked() {
    searchResultPage = 0
    searchString = searchStringEdited
    saveStateToHash()
}

// search is only called indirectly through a hash change
function search() {
    regexError = null
    const result = []
    let re
    try {
        re = new RegExp(searchString, "i")
    } catch (e) {
        regexError = e.message
        searchResult = result
        return
    }
    for (const message of messages) {
        if (re.test(message.text)) {
            result.push(message)
        }
    }
    searchResult = result
    lastSearchString = searchString
}

function setResultPage(value) {
    switch(show) {
    case "users":
        userResultPage = value
        break
    case "search":
        searchResultPage = value
        break
    case "messages":
        messageResultPage = value
        break
    default:
        throw new Error("setResultPage: unexpected case: " + show)
    }
    saveStateToHash()
}

function getResultPage() {
    switch(show) {
    case "users":
        return userResultPage
    case "search":
        return searchResultPage
    case "messages":
        return messageResultPage
    default:
        throw new Error("getResultPage: unexpected case: " + show)
    }
}

function choosePage(pageCount) {
    const newPageString = prompt("Goto page 1 - " + pageCount + "?")
    if (!newPageString) return
    const newPage = Math.min(pageCount, Math.max(1, parseInt(newPageString))) - 1
    setResultPage(newPage)
    saveStateToHash()
}

function viewPager(result) {
    const pageCount = Math.ceil(result.length / pageSize)
    return m("div.ml5",
        (result.length > pageSize)
            ? [
                m("span.mr2.b", { onclick: () => setResultPage(0) }, "|<"),
                m("span.mr2.b", { onclick: () => setResultPage(Math.max(getResultPage() - 1, 0)) }, "<<"),
                m("span.w3", {onclick: () => choosePage(pageCount) }, (getResultPage() + 1), " of ", pageCount),
                m("span.ml2.b", { onclick: () => setResultPage(Math.min(getResultPage() + 1, pageCount - 1)) }, ">>"),
                m("span.ml2.b", { onclick: () => setResultPage(pageCount - 1) }, ">|")
            ] 
            : []
    )
}

function viewPage(result, includeUser) {
    const pageResult = result.slice(getResultPage() * pageSize, getResultPage() * pageSize + pageSize)
    return m("div", [
        viewPager(result),
        viewMessagesForList(pageResult, includeUser),
        viewPager(result)
    ])
}

function viewSearch() {
    return m("div.ml2", [
        "Search (regex, case-insensitive):", m("input.ml1", {
            value: searchStringEdited,
            oninput: (event) => searchStringEdited = event.target.value,
            onkeydown: (event) => onSearchInputKeyDown(event)
        }),
        m("button.ml2", { onclick: () => searchButtonClicked() }, "Search"),
        m("span.ml2", "# matches: " + searchResult.length),
        m("br"),
        regexError ? m("div.red", regexError) : [],
        viewPage(searchResult, "includeUser")
    ])
}

// ----------------- messages

function viewMessages() {
    return m("div.ml2", [
        viewPage(messages, "includeUser")
    ])
}

// ----------------- main

function setShow(value) {
    show = value
    saveStateToHash()
}

function viewMainMenu() {
    return m("div.mb2.ml5",
        m("span" + (show === "users" ? ".b" : ""), {
            onclick: () => setShow("users" )
        }, "Users (" + Object.keys(users).length + ")"), 
        m("span.ml3" + (show === "search" ? ".b" : ""), {
            onclick: () => setShow("search")
        }, "Search (" + searchResult.length + ")"),
        m("span.ml3" + (show === "messages" ? ".b" : ""), {
            onclick: () => setShow("messages")
        }, "Messages (" + messages.length + ")"),
        m("span.ml3" + (show === "words" ? ".b" : ""), {
            onclick: () => setShow("words")
        }, "Words (" + (stats_words ? stats_words.length : "Wait:" + current_stats_index )+ ")"),
    )
}

function viewMain() {
    return m("div", [
        viewMainMenu(),
        (show === "users") ? viewUsers() : [],
        (show === "search") ? viewSearch() : [],
        (show === "messages") ? viewMessages() : [],
        (show === "words") ? viewWords() : [],
    ])
}

function isEverythingLoaded() {
    return messages !== null && users !== null
}

function viewLoadingProgress() {
    return m("div",
        m("div", "users: ", users ? "Loaded" : m("span.yellow", "Loading...")),
        m("div", "messages: ", messages ? messages.length : m("span.yellow", "Loading...")),
    )
}

function viewGitterArchive() {
    return m(".main", [
        m("h1.ba.b--blue", { class: "title" }, "Mithril Gitter Archive Viewer"),
        isEverythingLoaded() 
            ? [ viewMain() ] 
            : viewLoadingProgress()
    ])
}

const archiveType = "gitter"

async function startup() {

    if (archiveType === "gitter") {
        users = await m.request({
            method: "GET",
            url: "data/allUsers.json"
        })

        messages = await m.request({
            method: "GET",
            url: "data/allMessages.json"
        })
    } else if (archiveType === "email") {
        const email = await m.request({
            method: "GET",
            url: "data/Bootstrap2.mbox",
            deserialize: text => text
        })

        processEmail(email)
    }

    updateUserRankAndPostCount()
 
    setTimeout(() => {
        processWordStats(0)
    }, 0)

    loadStateFromHash(m.route.param())
    m.redraw()
}

function processEmail(email) {
    messages = []
    users = {}
    const emails = email.split(/^From /m)
    let unknownIndex = 1
    for (let email of emails) {
        if (!email || email === " ") continue
        // email = email.replace(/^>From /m, "From ")
        email = "From " + email
        const subject = email.match(/^Subject: ([^\n\r]*)/m)
        const title = subject ? subject[1] : ""
        const fromMatch = email.match(/^From: ([^\n\r]*)/m)
        const from = fromMatch ? fromMatch[1]: "UNKNOWN"
        const idMatch = email.match(/^Message-Id: ([^\n\r]*)/m)
        const id = idMatch ? idMatch[1]: "UNKNOWN:" + unknownIndex++
        const dateMatch = email.match(/^Date: ([^\n\r]*)/m)
        const dateLong = dateMatch ? dateMatch[1]: "UNKNOWN"
        let date
        try {
            date = new Date(dateLong).toISOString()
        } catch (e) {
            console.log("Bad date", dateLong)
            date = dateLong
        }

        let username
        let displayName
        if (from.includes("<")) {
            const emailAddressMatch = from.match(/(.*)<([^>]*)>/)
            displayName = emailAddressMatch ? emailAddressMatch[1] : ""
            username = emailAddressMatch ? emailAddressMatch[2] : from
            displayName = displayName.replace(/"/gi, "")
        } else {
            username = from
            displayName = ""
        }
        username = username.trim()
        displayName = displayName.trim()

        const isoMatch = displayName.match(/=\?iso-8859-1\?q\?([^?]*)/i)
        if (isoMatch) {
            displayName = isoMatch[1].replace("=20", " ")
        }

        if (username.includes("(")) {
            const parenUserName = username
            username = parenUserName.split("(")[0].trim()
            displayName = parenUserName.split("(")[1].split(")")[0].trim()
        }

        username = username.toLowerCase()
        username = username.replace(" at ", "@")

        const message = {
            id,
            sent: date,
            username,
            text: email,
            title
        }
        if (users[username]) {
            //if (users[username].displayName === username) {
            //    users[username].displayName = displayName || username
            //}
            const previousDisplayName = users[username].displayName
            if (previousDisplayName !== displayName) {
                // console.log("multiple names for user", username, previousDisplayName, displayName)
                // pick the longest
                if (!displayName.includes("(") && displayName.length >= previousDisplayName.length) {
                    users[username].displayName = displayName
                }
            }
        }
        else {
            users[username] = {
                username,
                displayName: displayName
            }
        }
        messages.push(message)
    }
    
    // Ensure all users have a displayName
    for (let username of Object.keys(users)) {
        const user = users[username]
        const name = user.username.split("@")[0]
        if (!user.displayName) user.displayName = name
    }
}

function updateUserRankAndPostCount() {
    for (let message of messages) {
        const username = message.username
        const user = users[username]
        if (!user) {
            throw new Error("missing user for: " + username)
        }
        user.postCount = (user.postCount || 0) + 1
    }

    // Ranks the users based on postCount and their username (if a tie)
    const rankedUsers = []

    for (let username of Object.keys(users)) {
        rankedUsers.push(users[username])
    }

    rankedUsers.sort((a, b) => {
        if (a.postCount !== b.postCount) return b.postCount - a.postCount
        return a.username.localeCompare(b.username)
    })

    for (let i = 0; i < rankedUsers.length; i++) {
        const user = rankedUsers[i]
        user.rank = i + 1
    }
}

m.route(document.body, "/", {
    "/":
    {
        onmatch: (args) => {
            if (isEverythingLoaded()) loadStateFromHash(args)
        },
        render: viewGitterArchive
    }
})

startup()
