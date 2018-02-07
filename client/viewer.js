"use strict"
/* global m */

// Processed data to display
let stats_messages = "Loading..."
let stats_users = "Loading..."
let users = null
let messages = null

// Which view of: users, search, and messages
let show = "users"

// User table view
let currentUsername = null
let sortBy = "id"
let sortReverse = false
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
        sortBy,
        sortReverse,
        userResultPage,
        searchString,
        searchResultPage,
        selectedMessage: selectedMessage ? selectedMessage.id : "",
        messageResultPage
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
    sortBy = valueOrDefault(hashParams.sortBy, "id")
    sortReverse = valueOrDefault(hashParams.sortReverse, false, "boolean")
    userResultPage = valueOrDefault(hashParams.userResultPage, 0, "number")
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
        m("span.dib", { style: (selectedMessage === message) ? "white-space: pre-wrap" : "" }, message.text)
    ))
}

function viewMessagesForUser(username) {
    const result = []
    for (const message of messages) {
        if (message.username === username) {
            result.push(message)
        }
    }
    return viewPage(result)
}

function headerClick(field) {
    currentUsername = null
    if (sortBy === field) {
        sortReverse = !sortReverse
    } else {
        sortBy = field
    }
    saveStateToHash()
}

function viewUsers() {
    const sortedUsers = Object.keys(users)
    switch (sortBy) {
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
        throw new Error("unexpected sort case")
    }
    if (sortReverse) sortedUsers.reverse()
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
                m("span.dib", { style: "width: 12rem" }, user.username),
                " ",
                m("span.i.dib", { style: "width: 12rem" }, user.displayName),
                " ",
                m("span.dib.w3", user.rank),
                " ",
                m("span.dib.w3", user.postCount)
            ),
            isSelected ? viewMessagesForUser(username) : []
        )
    })
    const sortCharacter = m("span.b", sortReverse ? "▼" : "▲")
    // Thes space between fields are there so if you copy and paste the data it has space seperators for items.
    const header = m("div.ml2", { key: " HEADER " },
        m("span", 
            m("span.dib", { style: "width: 12rem", onclick: () => headerClick("id") }, "ID", ((sortBy === "id") ? sortCharacter : [])),
            " ",
            m("span.dib", { style: "width: 12rem", onclick: () => headerClick("name") }, "Name", ((sortBy === "name") ? sortCharacter : [])),
            " ",
            m("span.dib.w3", { onclick: () => headerClick("rank") }, "Rank", ((sortBy === "rank") ? sortCharacter : [])),
            " ",
            m("span.dib.w3", { onclick: () => headerClick("posts") }, "# Posts", ((sortBy === "posts") ? sortCharacter : []))
        )
    )
    return [header, table]
}

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
            onchange: (event) => searchStringEdited = event.target.value,
            onkeydown: (event) => onSearchInputKeyDown(event)
        }),
        m("button.ml2", { onclick: () => searchButtonClicked() }, "Search"),
        m("span.ml2", "# matches: " + searchResult.length),
        m("br"),
        regexError ? m("div.red", regexError) : [],
        viewPage(searchResult, "includeUser")
    ])
}

function viewMessages() {
    return m("div.ml2", [
        viewPage(messages, "includeUser")
    ])
}

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
    )
}

function viewMain() {
    return m("div", [
        viewMainMenu(),
        (show === "users") ? viewUsers() : [],
        (show === "search") ? viewSearch() : [],
        (show === "messages") ? viewMessages() : [],
    ])
}

function isEverythingLoaded() {
    return stats_messages && messages && stats_users && users
}

function viewLoadingProgress() {
    return m("div",
        m("div", "messages count: ", messages ? messages.length : m("span.yellow", "Loading...")),
        m("div", "stats_messages: ", stats_messages ? stats_messages : m("span.yellow", "Loading...")),
        m("div", "stats_users: ", stats_users ? "Loaded" : m("span.yellow", "Loading...")),
        m("div", "users: ", users ? "Loaded" : m("span.yellow", "Loading..."))
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

async function startup() {
    stats_messages = await m.request({
        method: "GET",
        url: "data/stats/stats_messages.txt",
        deserialize: text => text
    })

    stats_users = await m.request({
        method: "GET",
        url: "data/stats/stats_users.txt",
        deserialize: text => text
    })

    users = await m.request({
        method: "GET",
        url: "data/allUsers.json"
    })

    // await on this later so we can process the user data while we are waiting
    const promiseForAllMessages = m.request({
        method: "GET",
        url: "data/allMessages.json"
    })

    updateUserRankAndPostCount()

    messages = await promiseForAllMessages
}

function updateUserRankAndPostCount() {
    stats_users.split("\n").forEach(line => {
        if (!line.trim()) return
        const [ rank, username, postCount ] = line.split(" ")
        const user = users[username]
        if (!user) {
            throw new Error("missing user for: " + username)
        }
        user.rank = rank
        user.postCount = postCount
    })
}

m.route(document.body, "/", {
    "/": {
        view: () => {
            if (isEverythingLoaded()) loadStateFromHash(m.route.param())
            return viewGitterArchive()
        }
    }
})

startup()
