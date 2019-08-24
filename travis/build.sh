#!/bin/bash

declare -a files=("Web/public/css/custom.css" "Web/public/js/app.js")
declare -a minified_files=("Web/public/css/customHASH.min.css" "Web/public/js/appHASH.min.js")
declare js_tag="<script src='/static/js/FILENAME'></script>"
declare css_tag="<link rel='stylesheet' href='/static/css/FILENAME'>"
head_draft=""

write_head_file() {
    echo -e $head_draft > Web/views/partials/head-build.ejs
}

remove_old_file() {
    local file_name=${1##*/}
    find Web/public -name ${file_name/HASH/"-*"} -delete
}

minify_file() {
    if [ "${1##*.}" = "js" ]
    then
        uglifyjs -c -m --comments /GPL/ -- $1 > ${2/HASH/""}
    else
        cleancss $1 > ${2/HASH/""}
    fi
}

set_hash() {
    local original_file_name=${1/HASH/""}
    local checksum=$(md5sum $original_file_name)
    local file_hash="-${checksum:0:10}"
    mv $original_file_name ${1/HASH/$file_hash}
    echo ${1/HASH/$file_hash}
}

append_head_draft () {
    local file_name=${1##*/}
    if [ "${file_name##*.}" = "js" ]
    then
        head_draft="${head_draft}${js_tag/FILENAME/$file_name}\n"
    else
        head_draft="${head_draft}${css_tag/FILENAME/$file_name}\n"
    fi
}

for index in "${!files[@]}"; do
    remove_old_file ${minified_files[$index]}
    minify_file ${files[$index]} ${minified_files[$index]}
    append_head_draft $(set_hash ${minified_files[$index]})
done

write_head_file

bash travis/pushback.sh