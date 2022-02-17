var fs = require("fs")

const allMessages = []
const messageByID = {}
let duplicateCount = 0
let uniqueCount = 0

const allUsers = {}

const fileNames = fs.readdirSync("messages")
for (let fileName of fileNames) {
    if (!fileName.endsWith(".json")) continue
    console.log("processing", fileName)
    const contents = fs.readFileSync("messages/" + fileName)
    const messages = JSON.parse(contents)
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i]
        if (messageByID[message.id]) {
            duplicateCount++
            console.log("duplicate", duplicateCount, message.id)
            continue
        }
        uniqueCount++
        messageByID[message.id] = true
        allMessages.push({
            id: message.id,
            sent: message.sent,
            username: message.fromUser.username,
            text: message.text
        })

        if (!allUsers[message.fromUser.username]) {
            allUsers[message.fromUser.username] = message.fromUser
        } else if (allUsers[message.fromUser.username].id !== message.fromUser.id) {
            throw new Error("User name is not unique for: " + message.fromUser.username)
        }
    }
}

allMessages.sort((a, b) => a.sent < b.sent ? -1 : (a.sent > b.sent ? 1 : 0))

console.log("uniqueCount", uniqueCount)

if (!uniqueCount) console.log("Did you copy the json file from new-messages to the messages folder?")

fs.writeFileSync("client/data/allMessages.json", JSON.stringify(allMessages, null, 1))

fs.writeFileSync("client/data/allUsers.json", JSON.stringify(allUsers, null, 1))
