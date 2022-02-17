# Used to generate stat_users.txt via:
node ./generate_user_stats.js > stats/stats_users.txt

# Used to generate stats_words.txt via:
node ./generate_word_stats.js > stats/stats_words.txt

# Used to generate stats_words_alphabetical.txt
node ./generate_word_stats.js --alphabetical > stats/stats_words_alphabetical.txt