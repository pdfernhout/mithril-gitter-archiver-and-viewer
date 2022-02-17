# Download all message from Mithril gitter chat room.

# This will download from latest to earliest, creating sequentially numbered files.
# That can be a bit confusing since it it going backward in time.
# I could not figure out a way to otherwise find the earliest message ID to go forwards from it.

# If you need to use this script again at a later time, it will overlap earlier downloads,
# so you should move them out of the way first.

# If something goes wrong and you need to download more (earlier) messages, 
# you can adjust some variables below so you don't redownload the later messages.
# Fill in an updated FILE_COUNT and BEFORE_ID below to continue from where you left off.
# FILE_COUNT should be one greater than the number of the last file downloaded (or 1 as default).
# BEFORE_ID will be from the first (earliest) message in the last file downloaded (or "" as default).
FILE_COUNT=1
BEFORE_ID=""

# If you run this script at a later time
# fill in a STOP_AT_TIMESTAMP to stop downloading when reaching a message before the timestamp.
# There will likely be overlap and you will have to remove duplicate messages.
# Leave as "" for no earliest limit.
STOP_AT_TIMESTAMP=""

# Mithril room ID -- you need to look up room IDs otherwise using:
# curl -H "Accept: application/json" -H "Authorization: Bearer $BEARER_TOKEN" "https://api.gitter.im/v1/rooms"
ROOM_ID=5501985215522ed4b3dd2ac3

# Where you want the messages to be stored and hwo you want the files named
OUTPUT_DIR=new-messages
FILE_NAME_PREFIX=messages

# How long to pause between requests (to server error)
SLEEP_DELAY=5s

# Before running this script, you need to get your own Gitter access token from: https://developer.gitter.im/apps
# Then either pass it on the command line as the first argument
# or set a shell variable using: export GITTER_TOKEN=YOUR_TOKEN_HERE
if [ ! -z $1 ]; then
    BEARER_TOKEN=$1
else
    BEARER_TOKEN=$GITTER_TOKEN
fi
if [[ -z $BEARER_TOKEN ]]; then
	echo "You need to export GITTER_TOKEN before running this script or otherwise pass the token on the command line"
	echo "usage: $0 ACCESS_TOKEN"
	exit
fi

if [[ ! -d $OUTPUT_DIR ]]; then
    mkdir -p $OUTPUT_DIR;
fi

# get latest messages and work backwards
while [ 1 ]
do
	FILE_NAME=$FILE_NAME_PREFIX$(printf "%05d" $FILE_COUNT).json
    echo "About to fetch $FILE_COUNT starting from before ID $BEFORE_ID"
	curl -s -H "Accept: application/json" -H "Authorization: Bearer $BEARER_TOKEN" "https://api.gitter.im/v1/rooms/$ROOM_ID/chatMessages?beforeId=$BEFORE_ID" | jq "." > $OUTPUT_DIR/$FILE_NAME
	echo "Wrote $FILE_NAME"

	# Check for errors
	RESULT_TYPE="$(jq -r "type" $OUTPUT_DIR/$FILE_NAME)"
	if [[ ! $RESULT_TYPE == "array" ]]; then
	    echo "Some kind of error happened"
		cat $OUTPUT_DIR/$FILE_NAME
		exit
	fi

	BEFORE_ID="$(jq -r '.[0].id' $OUTPUT_DIR/$FILE_NAME)"
	if [[ -v $BEFORE_ID || $BEFORE_ID == "null" ]]; then
	    echo "End of messages"
		break
	fi

	SENT_TIMESTAMP="$(jq -r '.[0].sent' $OUTPUT_DIR/$FILE_NAME)"
	if [[ -v $SENT_TIMESTAMP || $SENT_TIMESTAMP < $STOP_AT_TIMESTAMP || $SENT_TIMESTAMP == $STOP_AT_TIMESTAMP ]]; then
	    echo "Reached STOP_AT_TIMESTAMP $STOP_AT_TIMESTAMP"
		break
	fi

	FILE_COUNT=$((FILE_COUNT+1))
	sleep $SLEEP_DELAY
done
