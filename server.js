"use strict"

/* eslint no-console: "off" */

const http = require("http")
const fs = require("fs")
const path = require("path")
const url = require("url")

function applicationLog() {
    var newArguments = [new Date().toISOString()].concat(Array.prototype.slice.call(arguments))
    console.log.apply(console, newArguments)
}

const serverPort = 8444

const JSONContentType = { "Content-Type": "application/json" }

function respondWithJSON(response, object, nocache) {
    let headerExtra = Object.assign({}, JSONContentType)
    if (!object.error && !nocache) headerExtra = Object.assign(headerExtra, {"Cache-Control": "max-age=3600"})
    response.writeHead(object.error || 200, object.errorMessage || "OK", headerExtra)
    response.end(JSON.stringify(object))
}

function respondWithContent(response, contentType, content, nocache) {
    response.writeHead(200, "OK", { "Content-Type": contentType, "Cache-Control": nocache ? "max-age=0" : "max-age=3600" })
    response.end(content)
}

function respondWithResourceNotFoundError(response, url) {
    respondWithJSON(response, { error: 404, errorMessage: "Resource Not Found", url: url})
}

function respondWithFileContents(response, sha256, filePath, url, contentType, nocache, callback) {
    fs.readFile(filePath, function(error, contents) {
        if (error) {
            if (error.code === "ENOENT") {
                respondWithResourceNotFoundError(response, url)
            } else {
                console.error("readFile error", error.stack)
                respondWithJSON(response, { error: 500, errorMessage: "Error reading file", sha256: sha256})
            }
        } else {
            if (callback) {
                callback(response, url, contentType, contents.toString())
            } else {
                if (!contentType) {
                    const result = {sha256: sha256, contents: contents.toString()}
                    respondWithJSON(response, result)
                } else {
                    respondWithContent(response, contentType, contents, nocache)
                }
            }
        }
    })
}

const bootstrapFiles = {
    "bootstrap.html": "text/html",
    "viewer.html": "text/html",
    "viewer.js": "application/javascript",
    "mithril.v1.1.6.js": "application/javascript",
    "tachyons.v4.9.0.css": "text/css",

    "allMessages.json": "application/json",
    "allUsers.json": "application/json",
    "Bootstrap2.mbox": "text/plain",
}
s
const apiPathForBootstrap = "/"
const apiPathForData = "/data/"

function getBootstrapFile(request, response, apiPath, folder) {
    const parsedURL = url.parse(request.url, true)
    // Only return whitelisted files
    const fileName = parsedURL.pathname.substring(apiPath.length)
    console.log("bootstrap", apiPath, fileName, folder)
    const mimeType = bootstrapFiles[fileName]
    if (mimeType) {
        const filePath = path.resolve(__dirname, folder + fileName)
        respondWithFileContents(response, null, filePath, request.url, mimeType, "nocache")
    } else {
        respondWithResourceNotFoundError(response, request.url)
    }
}

function handleGetRequest(request, response) {
    if (request.url.startsWith(apiPathForData)) {
        getBootstrapFile(request, response, apiPathForData, "client/data/")
    } else if (request.url.startsWith(apiPathForBootstrap)) {
        getBootstrapFile(request, response, apiPathForBootstrap, "client/")
    } else {
        respondWithResourceNotFoundError(response, request.url)
    }
}

function handleRequest(request, response) {
    applicationLog("request", request.method, request.url)
    if (request.method === "GET") {
        handleGetRequest(request, response)
    } else {
        respondWithJSON(response, { error: 405, errorMessage: "Method Not Supported", url: request.url })
    }
}

const server = http.createServer(handleRequest)

server.listen(serverPort)

applicationLog("============ server starting ============")
applicationLog("Server running at http://localhost:" + serverPort + "/viewer.html")
