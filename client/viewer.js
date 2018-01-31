/* global m */

let stats_messages = "Loading..."
let stats_users = "Loading..."
let messages = null

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

    messages = await m.request({
        method: "GET",
        url: "/data/allMessages.json"
    })
}

const GitterArchiveViewer = {
    view: function() {
        return m(".main", [
            m("h1.ba.b--blue", { class: "title" }, "Gitter Archive Viewer"),
            m("div", "stats_messages: ", stats_messages),
            m("div", "messages count: ", messages ? messages.length : "Loading..."),
            m("div", "stats_users: ", m("pre", stats_users)),

        ])
    }
}

m.mount(document.body, GitterArchiveViewer)

startup()