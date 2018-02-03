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
let searchResult = []
let searchResultPage = 0

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

function jumpToMessage(message) {
    if (selectedMessage === message) {
        selectedMessage = null
        return
    }
    show = "messages"
    messageResultPage = Math.floor(messages.indexOf(message) / pageSize)
    selectedMessage = message
}

function jumpToUser(username) {
    show = "users"
    currentUsername = username
    userResultPage = 0
}

function displayMessagesForList(subset, includeUser) {
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

function displayMessagesForUser(username) {
    const result = []
    for (const message of messages) {
        if (message.username === username) {
            result.push(message)
        }
    }
    return page(result)
}

function headerClick(field) {
    currentUsername = null
    if (sortBy === field) {
        sortReverse = !sortReverse
    } else {
        sortBy = field
    }
}

function displayUsers() {
    const sortedUsers = Object.keys(users)
    switch (sortBy) {
    case "id":
        sortedUsers.sort()
        break
    case "name":
        sortedUsers.sort((a, b) => users[a].displayName.localeCompare(users[b].displayName))
        break
    case "rank":
        sortedUsers.sort((a, b) => users[b].rank - users[a].rank)
        break
    case "posts":
        sortedUsers.sort((a, b) => users[b].postCount - users[a].postCount)
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
            isSelected ? displayMessagesForUser(username) : []
        )
    })
    const sortCharacter = m("span.b", sortReverse ? "▲" : "▼")
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
        searchString = event.target.value
        search()
    } else {
        event.redraw = false
    }
}

function search() {
    const result = []
    const re = new RegExp(searchString, "i")
    for (const message of messages) {
        if (re.test(message.text)) {
            result.push(message)
            /*
            if (result.length >= 1000) {
                result.push({id: " TOO MUCH ", sent: "", text: "TOO MANY SEARCH RESULTS"})
                break
            }
            */
        }
    }
    searchResult = result
    searchResultPage = 0
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
}

function displayPager(result) {
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

function page(result, includeUser) {
    const pageResult = result.slice(getResultPage() * pageSize, getResultPage() * pageSize + pageSize)
    return m("div", [
        displayPager(result),
        displayMessagesForList(pageResult, includeUser),
        displayPager(result)
    ])
}

function displaySearch() {
    return m("div.ml2", [
        "Search (regex, case-insensitive):", m("input.ml1", {
            value: searchString,
            onchange: (event) => searchString = event.target.value,
            onkeydown: (event) => onSearchInputKeyDown(event)
        }),
        m("button.ml2", { onclick: () => search() }, "Search"),
        m("span.ml2", "# matches: " + searchResult.length),
        m("br"),
        page(searchResult, "includeUser")
    ])
}

function displayMessages() {
    return m("div.ml2", [
        page(messages, "includeUser")
    ])
}

function displayViewer() {
    return m("div", [
        m("div.mb2.ml5",
            m("span" + (show === "users" ? ".b" : ""), {
                onclick: () => show = "users" 
            }, "Users (" + Object.keys(users).length + ")"), 
            m("span.ml3" + (show === "search" ? ".b" : ""), {
                onclick: () => show = "search"
            }, "Search (" + searchResult.length + ")"),
            m("span.ml3" + (show === "messages" ? ".b" : ""), {
                onclick: () => show = "messages"
            }, "Messages (" + messages.length + ")"),
        ),
        (show === "users") ? displayUsers() : [],
        (show === "search") ? displaySearch() : [],
        (show === "messages") ? displayMessages() : [],
    ])
}

const GitterArchiveViewer = {
    view: function() {
        const isEverythingLoaded = stats_messages && messages && stats_users && users
        return m(".main", [
            m("h1.ba.b--blue", { class: "title" }, "Mithril Gitter Archive Viewer"),
            isEverythingLoaded 
                ? [ displayViewer() ] 
                : [
                    m("div", "messages count: ", messages ? messages.length : m("span.yellow", "Loading...")),
                    m("div", "stats_messages: ", stats_messages ? stats_messages : m("span.yellow", "Loading...")),
                    m("div", "stats_users: ", stats_users ? "Loaded" : m("span.yellow", "Loading...")),
                    m("div", "users: ", users ? "Loaded" : m("span.yellow", "Loading..."))
                ]
        ])
    }
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

m.mount(document.body, GitterArchiveViewer)

startup()
