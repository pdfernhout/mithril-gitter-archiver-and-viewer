# mithril-gitter-archiver-and-viewer

These are tools in Bash and Node.js for downloading
all the messages in the Gitter chatroom for MithrilJS/mithril.js
and then processing them to create some simple statistics.

You could use them for downloading any Gitter chatroom
by modifying the hardcoded room ID in the downloading script.

The Mithril Gitter archives are publicly accessible here:
https://gitter.im/mithriljs/mithril.js/archives/

## What is Mithril?

Mithril is a modern client-side Javascript framework for building Single Page Applications.
It's small (< 8kb gzip), fast and provides routing and XHR utilities out of the box.
See: https://mithril.js.org/

You can write applications almost entirely in just plain JavaScript or TypeScript 
if you combine Mithril with a CSS library like Tachyons: http://tachyons.io/

## Prerequisites

The downloader bash script requires you have "jq" installed for json parsing.

You need to have node installed to ue the data processing tool and launch the server for the viewer.

I have only tested these tools under GNU/Linux.

## mithril-gitter-downloader

This is a bash script to do the downloading of messages.
It created a lot of files in new-messages folder.

Each messages file has about 50 messages.
There currently are over 3400 of them.

It took about eight hours to download all the messages with a five second sleep after each request.

Before running this script, you need to get your own Gitter access token from: https://developer.gitter.im/apps

Then either pass the token on the command line as the first argument or set a shell variable using: 
> export GITTER_TOKEN=YOUR_TOKEN_HERE

TODO: Ideally this downloading script should be smart about restarting downloads and also downloading new messages. But it isn't. As a workaround, you can continue a download by editing the script to set the message ID and file number to start using. Also, in theory, after a successful download, to get more recent messages days later, you could also run the script manually for a bit and then manually stop it (after editing the starting file number in the script to not overwrite previous messages files) -- keeping in mind that coalesce.js will eliminate duplicate messages if there is some overlap. You can also set a stop timestamp.

## coalesce.js

This is a node script to convert all the messages into one big allMessages.json file.
That file is about 37 megabytes as of this writing (2018).

The current bash download script stores the messages in "new-messages" folder.
You will need to rename that as messages for the coalesce.js script to work.
The reason for this is that I did not want to accidentally overwrite hours of previously downloaded
messages by accident if running the script a second time.

## generate_user_stats.js

Outputs a list of all users in order of how many posts they have made.

Used to generate stat_users.txt via:
> $ node ./generate_user_stats.js > stats/stats_users.txt

## generate_word_stats.js

These are node scripts to generate stats_words.txt and stats_words_alphabetical.txt.

Used to generate stats_words.txt via:
> node ./generate_word_stats.js > stats/stats_words.txt

Used to generate stats_words_alphabetical.txt via:
> node ./generate_word_stats.js --alphabetical > stats/stats_words_alphabetical.txt

## Size of the Mithril Gitter community

tl;dr More than 800 users have posted to the Mithril Gitter community -- for a total of over 160,000 messages (as of 2018).

# Viewer for Mithril Gitter Archive data and related statistics.

This viewer is intended for the Mithril Gitter community but could be useful for other communities.

The supporting data needs to be prepared using the downloader and related tool.

## Usage

First, on your command line from the project root directory:
> $ node server.js

Then, in your browser:
> http://localhost:8444/viewer.html

## License:

MIT for code.

Any included content from Gitter is presumed fair use for research purposes.
Further redistribution of such content may requiring reviewing its licensing situation.
