# Download all message from Mithril gitter

# fill in an updated FILE_COUNT and NEXT_ID below to continue from where you left off
FILE_COUNT=1
NEXT_ID=""

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
	FILE_NAME=$FILE_NAME_PREFIX$(printf "%04d" $FILE_COUNT).json
    echo "About to fetch $FILE_COUNT starting from ID $NEXT_ID"
	curl -s -H "Accept: application/json" -H "Authorization: Bearer $BEARER_TOKEN" "https://api.gitter.im/v1/rooms/$ROOM_ID/chatMessages?beforeId=$NEXT_ID" | jq "." > $OUTPUT_DIR/$FILE_NAME
	echo "Wrote $FILE_NAME"

	# Check for errors
	RESULT_TYPE="$(jq -r "type" $OUTPUT_DIR/$FILE_NAME)"
	if [[ ! $RESULT_TYPE == "array" ]]; then
	    echo "Some kind of error happened"
		cat $OUTPUT_DIR/$FILE_NAME
		exit
	fi

	NEXT_ID="$(jq -r '.[0].id' $OUTPUT_DIR/$FILE_NAME)"
	if [[ -v $NEXT_ID || $NEXT_ID == "null" ]]; then
	    echo "End of messages"
		break
	fi
	FILE_COUNT=$((FILE_COUNT+1))
	sleep $SLEEP_DELAY
done
