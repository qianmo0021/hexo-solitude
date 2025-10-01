const YML = require('yamljs');
const fs = require('fs');

let ls = [],
    data = YML.parse(fs.readFileSync('source/_data/links.yml').toString().replace(/(?<=rss:)\s*\n/g, ' ""\n'));

data.forEach((e, i) => {
    let j = 3;  // 获取友链数组的范围（除了最后，前面的都获取）
    if (i < j) ls = ls.concat(e.link_list);
});

// 修改文件名：在 flink_count.json 前加上 solitude_
fs.writeFileSync('./source/solitude_flink_count.json', `{"link_list": ${JSON.stringify(ls)},"length":${ls.length}}`);
console.log('solitude_flink_count.json 文件已生成。');