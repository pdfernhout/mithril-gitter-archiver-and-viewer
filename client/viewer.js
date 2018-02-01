/* global m */

let stats_messages = "Loading..."
let stats_users = "Loading..."
let users = null
let messages = null

let currentUsername = null

/* Example message:
  "id": "550198834c839f3268162e60",
  "sent": "2015-03-12T13:45:39.963Z",
  "username": "StephanHoyer",
  "text": "Hi Leo"
 }
 */
/* example user:
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
*/

function displayMessagesForList(subset, includeUser) {
    return subset.map(message => m("div.ml3", 
        { key: message.id }, 
        m("span.blue.mr2", message.sent),
        includeUser
            ? [m("span.mr2", message.username)]
            : [],
        m("span", /* { style: "white-space: pre" }, */ message.text)
    ))
}

function displayMessagesForUser(username) {
    const result = []
    for (const message of messages) {
        if (message.username === username) {
            result.push(message)
        }
    }
    return displayMessagesForList(result)
}

let sortBy = "id"
let sortReverse = false

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
        return m("div.ml2", { key: user.id },
            m("span" + (isSelected ? ".b" : ""), 
                {
                    onclick: () => currentUsername === username ? currentUsername = null : currentUsername = username
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

let searchString = ""
let searchResult = []
let resultPage = 0

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
    resultPage = 0
}

const pageSize = 1000

function page(result) {
    const pageResult = result.slice(resultPage * pageSize, resultPage * pageSize + pageSize)
    const pageCount = Math.ceil(result.length / pageSize)
    return m("div", [
        m("div.ml5",
            (result.length > pageSize)
                ? [
                    m("span.mr2.b", { onclick: () => resultPage = 0 }, "|<"),
                    m("span.mr2.b", { onclick: () => resultPage = Math.max(resultPage - 1, 0) }, "<"),
                    m("span.w3", (resultPage + 1), " of ", pageCount),
                    m("span.ml2.b", { onclick: () => resultPage = Math.min(resultPage + 1, pageCount - 1) }, ">"),
                    m("span.ml2.b", { onclick: () => resultPage = pageCount - 1 }, ">|")
                ] 
                : []
        ),
        displayMessagesForList(pageResult, "includeUser")
    ])
}

function displayMessages() {
    return m("div.ml2", [
        "Search (regex, case-insensitive):", m("input.ml1", {
            value: searchString,
            onchange: (event) => searchString = event.target.value,
            onkeydown: (event) => onSearchInputKeyDown(event)
        }),
        m("button.ml2", { onclick: () => search() }, "Search"),
        m("span.ml2", "# matches: " + searchResult.length),
        m("br"),
        page(searchResult)
    ])
}

let show = "users"

function displayViewer() {
    return m("div", [
        m("div.mb2.ml5",
            m("span" + (show === "users" ? ".b" : ""), {
                onclick: () => show = "users" 
            }, "Users (" + Object.keys(users).length + ")"),
            m("span.ml3" + (show === "messages" ? ".b" : ""), {
                onclick: () => show = "messages"
            }, "Messages (" + messages.length + ")")
        ),
        (show === "users") 
            ? displayUsers()
            : displayMessages()
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
        url: "/data/stats/stats_messages.txt",
        deserialize: text => text
    })

    stats_users = await m.request({
        method: "GET",
        url: "/data/stats/stats_users.txt",
        deserialize: text => text
    })

    users = await m.request({
        method: "GET",
        url: "/data/allUsers.json"
    })

    // await on this later so we can process the user data while we are waiting
    const promiseForAllMessages = m.request({
        method: "GET",
        url: "/data/allMessages.json"
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
