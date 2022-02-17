var fs = require("fs")

const allMessages = JSON.parse(fs.readFileSync("client/data/allMessages.json"))
/* Example message:
 {
  "id": "550198834c839f3268162e60",
  "sent": "2015-03-12T13:45:39.963Z",
  "username": "StephanHoyer",
  "text": "Hi Leo"
 }
 */

 // The stop words are not currently used -- as they are commented out below.
const stopWordsList = ["i", "a", "about", "above", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also","although","always","am","among", "amongst", "amoungst", "amount",  "an", "and", "another", "any","anyhow","anyone","anything","anyway", "anywhere", "are", "around", "as",  "at", "back","be","became", "because","become","becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom","but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven","else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own","part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they", "thickv", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves", "the"]

stopWords = {}
for (let word of stopWordsList) stopWords[word] = true

stats = {}

for (let message of allMessages) {
    // Not removed: - _
    re = /[\t\n\r(.,\/\\#!$%\^&\*;:{}=\`\'~()<>\?\"\[\]\‘\’\“\”…]/g
    // re = /[^a-z]/g
    const words = message.text.toLowerCase().replace(re, " ").split(/(\s+)/)
    for (let word of words) {
        word = word.trim()
        if (!word) continue
        // if (stopWords[word]) continue
        stats[word] = (stats[word] || 0) + 1
    }
}

statsList = []
for (let key in stats) {
    statsList.push({word: key, count: stats[key]})
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

if (process.argv[2] === "--alphabetical") {
    statsList.sort(sortByWord)
} else {
    statsList.sort(sortByFrequencyAndWord)
}

for (let i = 0; i < statsList.length; i++) {
    console.log(statsList[i].word + " " + statsList[i].count)
}
