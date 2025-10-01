---
title: Github Action实现友链状态检测
tags:
  - Hexo
  - 博客配置
  - 教程
categories:
  - 教程
cover: >-
  https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/bc9476f6447b54574652a3ba9ab787d806e1dcaf76c1d0e036d5f27b0d82f4aaafe9037ce45e7910d250cc0987456fe1?pictype=scale&from=30113&version=3.3.3.3&fname=p0%283%29.png&size=1000

date: 2025-09-29 11:05:48
---
# Github Action实现友链状态检测




## 演示

![](https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/6014503eb1738863116466a9c61c473bcc69fd3a6f3640f3077fc986b4a759aa1d790da227215f1373fa899c1df5777d?pictype=scale&from=30113&version=3.3.3.3&fname=015dcd72c1c3fdadd24b732998523bd4.png&size=1000)

## 功能概览


1. github action自动定时检测友链状态，结果输出到page分支下的result.json。

2. 友链状态展示页面，可以部署到zeabur或者vercel或者cloudflare，加速api访问速度。

3. 为确保兼容性，实现了两种检测方案：

     - 非兼容：使用该格式文件动态读取友链内容，实现功能，友链列表自动实时性更新。

     - 兼容：使用TXT存储所有友链信息，兼容性好，适合所有站点，但是添加友链后可能需要手动更新文件。

4. API访问数据，api包含数据包括可达链接，不可达链接，可达链接数目。不可达链接数目，更新时间戳，其中链接中包含站点名称和地址，便于前端部署。

5. 测试脚本使用python，使用Request包的get和head两种检测方式检测，尽可能减少误判概率。

6. 前端采用本地缓存，减少api调用次数，缓存半个小时刷新，不影响实时性。

## 动态Json获取
该方法适用于hexo-theme-anzhiyu，其他主题不确定，但是需要自行修改代码实现相关功能，其实就是维护一个固定格式的友链在线列表。

首先，在hexo根目录下创建link.js，写入以下内容：

```js
const YML = require('yamljs')
const fs = require('fs')

let ls   = [],
    data = YML.parse(fs.readFileSync('source/_data/link.yml').toString().replace(/(?<=rss:)\s*\n/g, ' ""\n'));

data.forEach((e, i) => {
    let j = 3;  //获取友链数组的范围（除了最后，前面的都获取）
    if (i < j) ls = ls.concat(e.link_list)
});
fs.writeFileSync('./source/flink_count.json', `{"link_list": ${JSON.stringify(ls)},"length":${ls.length}}`)
console.log('flink_count.json 文件已生成。');

```
其中的`j`表示获取的友链数组的范围，比如你只想要第一组，那么填写1即可。

根目录下执行以下内容：
```BASH
node link.js
```

你将在`[HexoRoot]/source`文件夹下看到`flink_count.json`文件，文件格式如下：

```json
{
  "link_list": [
    {
      "name": "String",
      "link": "String",
      "avatar": "String",
      "descr": "String",
      "siteshot": "String"
    },{
      "name": "String",
      "link": "String",
      "avatar": "String",
      "descr": "String",
      "siteshot": "String"
    },
    // ... 其他76个博客站点信息
  ],
  "length": 77
}

```

我使用 `github action` 构建站点，则更方便，在` hexo g`前面任意位置添加：

```yaml
npm install yamljs --save
node link.js
```



自动化脚本如下：
```yml
name: Deploy Hexo and Update Friend Links

on:
  push:
    branches:
      - main

jobs:
  build-deploy:
    runs-on: ubuntu-latest

    steps:
      # 步骤1：检出代码
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # 步骤2：设置Node.js环境
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      # 步骤3：安装依赖
      - name: Install dependencies
        run: |
          npm install -g hexo-cli
          npm install
          sudo apt-get update
          sudo apt-get install -y jq curl

      # 步骤4：执行link.js脚本
      - name: Run link.js script
        run: node link.js

      # 步骤5：提交link.js生成的文件到另一个仓库
      - name: Update flink_count.json via API
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          function update_file() {
            local file_path=$1
            local target_repo="qianmo0021/link"
            local target_path=$(basename "$file_path")
            
            echo "Processing file: $target_path"
            
            RESPONSE=$(curl -s \
              -H "Authorization: token $GH_TOKEN" \
              -H "Accept: application/vnd.github.v3+json" \
              "https://api.github.com/repos/$target_repo/contents/$target_path")
            
            if echo "$RESPONSE" | jq -e '.sha' >/dev/null 2>&1; then
              SHA=$(echo "$RESPONSE" | jq -r '.sha')
              echo "File exists, will update"
            else
              SHA=""
              echo "File does not exist, will create"
            fi
            
            CONTENT=$(base64 -w0 "$file_path")
            
            REQUEST_DATA=$(jq -n \
              --arg msg "Auto-update $(target_path) $(date +'%Y-%m-%d %H:%M:%S')" \
              --arg content "$CONTENT" \
              --arg sha "$SHA" \
              '{
                message: $msg,
                content: $content,
                sha: $sha
              }')
            
            curl -X PUT \
              -H "Authorization: token $GH_TOKEN" \
              -H "Accept: application/vnd.github.v3+json" \
              -H "Content-Type: application/json" \
              "https://api.github.com/repos/$target_repo/contents/$target_path" \
              -d "$REQUEST_DATA"
            
            echo "File $target_path successfully updated"
          }

          update_file "./source/flink_count.json"

     
      # 步骤8：构建Hexo
      - name: Build Hexo
        run: |
          hexo bangumi -u
          hexo clean
          hexo generate

      # 步骤9：部署到GitHub Pages
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GH_TOKEN }}
          publish_dir: ./public
          publish_branch: gh-pages
          force_orphan: true
```

然后去`fork`我的仓库，或者自建公开仓库里面放入下面的自动化命令以及python脚本

自动化脚本

```YML
name: Auto Update Result JSON

on:
  schedule:
    - cron: '0 */12 * * *'  # 每 12 小时更新一次
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest

    steps:
    # 拉取仓库
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    # 安装 Python
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    # 安装依赖
    - name: Install dependencies
      run: |
        pip install requests python-dotenv

    # 运行生成 result.json
    - name: Run test-friend.py
      env:
        LIJIANGAPI_TOKEN: ${{ secrets.LIJIANGAPI_TOKEN }}
        PROXY_URL: ${{ secrets.PROXY_URL }}
      run: python test-friend.py

    # 更新 gh-pages 分支的 result.json，同时保留 index.html
    - name: Deploy result.json to gh-pages
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      run: |
        git config --global user.name "github-actions[bot]"
        git config --global user.email "github-actions[bot]@users.noreply.github.com"

        # 拉取 gh-pages 分支，或者创建一个新的
        git fetch origin gh-pages || true
        git worktree add gh-pages gh-pages || git worktree add gh-pages -b gh-pages

        # 复制 result.json 到 gh-pages 根目录
        cp result.json gh-pages/

        cd gh-pages
        git add result.json

        if git diff --staged --quiet; then
          echo "No changes in result.json"
        else
          git commit -m "Update result.json [ci skip]"
          git push https://x-access-token:$GITHUB_TOKEN@github.com/${{ github.repository }}.git HEAD:gh-pages
        fi
```

python：`test-friend.py`

```PYTHON
import json
import requests
import warnings
import time
import concurrent.futures
from datetime import datetime
from queue import Queue
import os

# 忽略警告信息
warnings.filterwarnings("ignore", message="Unverified HTTPS request is being made.*")

# 用户代理字符串，模仿浏览器
user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"

# API Key 和 请求URL的模板
if os.getenv("LIJIANGAPI_TOKEN") is None:
    print("本地运行，从环境变量中加载并获取API Key")
    from dotenv import load_dotenv
    load_dotenv()
else:
    print("在服务器上运行，从环境变量中获取API Key")

api_key = os.getenv("LIJIANGAPI_TOKEN")
api_url_template = "https://api.nsmao.net/api/web/query?key={}&url={}"

# 代理链接模板
proxy_url = os.getenv("PROXY_URL")
proxy_url_template = proxy_url + "{}" if proxy_url else None

# 初始化 API 请求队列
api_request_queue = Queue()

# 处理 API 请求
def handle_api_requests():
    while not api_request_queue.empty():
        item = api_request_queue.get()
        headers = {"User-Agent": user_agent}
        link = item['link']
        if not api_key:
            print("API Key 未提供，无法通过API访问")
            item['latency'] = -1
            break
        api_url = api_url_template.format(api_key, link)
        try:
            response = requests.get(api_url, headers=headers, timeout=15, verify=True)
            response_data = response.json()
            if response_data.get('code') == 200:
                latency = round(response_data.get('exec_time', -1), 2)
                print(f"成功通过API访问 {link}, 延迟为 {latency} 秒")
                item['latency'] = latency
            else:
                print(f"API返回错误，code: {response_data.get('code')}，无法访问 {link}")
                item['latency'] = -1
        except requests.RequestException:
            print(f"API请求失败，无法访问 {link}")
            item['latency'] = -1
        time.sleep(0.2)  # 控制速率

# 检查链接可访问性
def check_link_accessibility(item):
    headers = {"User-Agent": user_agent}
    link = item['link']
    latency = -1

    # 直接访问
    try:
        start_time = time.time()
        response = requests.get(link, headers=headers, timeout=15, verify=True)
        latency = round(time.time() - start_time, 2)
        if response.status_code == 200:
            print(f"成功通过直接访问 {link}, 延迟为 {latency} 秒")
            item['latency'] = latency
            return [item, latency]
    except requests.RequestException:
        print(f"直接访问失败 {link}")

    # 代理访问
    if proxy_url_template:
        try:
            proxy_link = proxy_url_template.format(link)
            start_time = time.time()
            response = requests.get(proxy_link, headers=headers, timeout=15, verify=True)
            latency = round(time.time() - start_time, 2)
            if response.status_code == 200:
                print(f"成功通过代理访问 {link}, 延迟为 {latency} 秒")
                item['latency'] = latency
                return [item, latency]
        except requests.RequestException:
            print(f"代理访问失败 {link}")
    else:
        print("未提供代理地址，无法通过代理访问")

    # 如果都失败，加入 API 队列
    item['latency'] = -1
    api_request_queue.put(item)
    return [item, latency]

# 读取 JSON 数据
json_url = 'https://raw.githubusercontent.com/qianmo0021/link/refs/heads/main/flink_count.json' 修改这里的同步到link仓库的flink_count.json地址
response = requests.get(json_url)
if response.status_code == 200:
    data = response.json()
    link_list = data.get('link_list', [])
else:
    print(f"Failed to retrieve data, status code: {response.status_code}")
    exit()

# 并发检查链接
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(check_link_accessibility, link_list))

# 处理 API 队列
handle_api_requests()

# 构造最终结果，包含 avatar 和 descr
link_status = [
    {
        'name': result[0]['name'],
        'link': result[0]['link'],
        'avatar': result[0].get('avatar', ''),
        'descr': result[0].get('descr', ''),
        'latency': result[0].get('latency', result[1])
    }
    for result in results
]

# 统计数量
accessible_count = sum(1 for result in results if result[1] != -1)
inaccessible_count = sum(1 for result in results if result[1] == -1)
total_count = len(results)

# 当前时间
current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# 写入结果 JSON
output_json_path = './result.json'
with open(output_json_path, 'w', encoding='utf-8') as file:
    json.dump({
        'timestamp': current_time,
        'accessible_count': accessible_count,
        'inaccessible_count': inaccessible_count,
        'total_count': total_count,
        'link_status': link_status
    }, file, ensure_ascii=False, indent=4)

print(f"检查完成，结果已保存至 '{output_json_path}' 文件。")
```
`json_url`修改这里的同步到link仓库的flink_count.json地址

修改结束，最终结果是一样的，所以并不影响任何后续操作，如果action正确运行，则你的结果应该出现在另一个分支了。（gh-page）分支。

提升准确率
由于该脚本通过action进行，可能会出现由于各种原因导致准确率极低的现象发生，此时我们需要通过各种方式提升检测的准确率，本脚本内置了通过[梨酱API](https://api.nsmao.net/)和[CloudFlare Worker](https://www.cloudflare.com/zh-cn/)转发的方式，可以分别应对屏蔽国外，以及使用国外CDN且防火墙屏蔽Github的两种情况，经过实测，最终准确率基本达到100%。
启用两种方式非常简单，仅需要设置对应的环境变量即可。

1、 梨酱API:
打开梨酱API并在右上角注册完成，进入控制台。进入控制台后，点击左边的密钥管理，生成密钥。
然后再在仓库设置->secret->action中，添加`LIJIANGAPI_TOKEN`的密钥即可自动启用。
2、 CloudFlare Worker：
其实上面的梨酱api就可以达到很高的准确率了，如果仍然有部分站本身能访问却无法检测，你可以尝试使用下面的方式进行检测：
首先部署转发代理，具体教程可以[查看文章](https://blog.liushen.fun/posts/dd89adc9/)，不需要绑定域名，因为github action本身就是国外环境。
然后添加密钥`PROXY_URL`，设置密钥即自动启用。

## 部署展示页面
在成功运行一次后，该仓库即成为了一个前端页面，可以自行安排上传到哪里，这里选择cloudflare上传，以下是大致步骤：

1、 登录cloudflare：

- 如果还没有账户，请先注册一个 cloudflare 账户。

- 登录后选择左侧菜单栏选择`计算`。

2、 导入GitHub仓库：
  - 点击创建`应用程序`按钮。
  - 选择`pages`。
  - 连接到您的 GitHub账户，并选择该链接检查项目的仓库。
3、 配置项目：
  - 确保选择正确的分支（gh-page）。
    4、部署项目：
    点击开始部署按钮开始部署。
  - 部署完成后，cloudflare会生成一个 URL，您可以使用这个 URL 访问部署的网页。
  - 此时如果不出意外，前端页面应该可以展示数据了，如下：
![](https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/8f0f22682fb0119103495ee93f4143eace5fb62e91b4356e57eedae9fb7c6dc1e19132394dcb919cef69f247ebb7822b?pictype=scale&from=30113&version=3.3.3.3&fname=8227cc10d8408e7a9324111ad60d752e.png&size=1000)

本站方案
注意，本站采用方案需要按照本站教程魔改友情链接页面，否则需要自行修改代码内容，所以仅供参考，请以自身情况为准
在`[BlogRoot]/source/link/index.md`下方填写以下内容：
```html

<style>
/* 胶囊角标 */
.status-tag {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 6px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    color: white;
    z-index: 10;
    background: rgba(178, 34, 34, 0.6);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 3px;
}
.site-card:hover .status-tag {
    transform: scale(0.8);
    opacity: 0.8;
}

/* 信号标志 */
.signal {
    display: flex;
    align-items: flex-end;
    height: 1em;
    gap: 1px;
}
.signal-bar {
    width: 2px;
    border-radius: 1px;
    transition: height 0.2s ease, background-color 0.2s ease;
}

/* 底部失效区域折叠样式 */
.telescopic-site-card-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
}
#invalid-links-section h2 {
    font-size: 18px;
    margin-bottom: 16px;
    color: #b22222;
    text-align: left;
}

</style>

<div id="invalid-links-section"></div>

<script>
function renderLinksWithStatus(jsonUrl) {
    const cacheKey = "linksStatusData";
    const cacheExpire = 30*60*1000;
    const placeholderSiteshot = "https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/05b155746f9fd45d217f3219f71ac86d63fff689761c80e8b08f2d44985cf6ed3454522481287158fbe8a4fed1d33595?pictype=scale&from=30113&version=3.3.3.3&fname=p0%207.png&size=1000";

    function decodeGoUrl(url){
        try {
            const params = new URL(url).searchParams;
            const u = params.get('u');
            if(u) return atob(u);
            return url;
        } catch { return url; }
    }

    function createStatusTag(latency){
        let className = 'status-tag-red';
        let text = '未知';
        let level = 1;
        if(latency !== -1){
            text = Math.round(latency*1000)+' ms';
            if(latency<=2) { className='status-tag-green'; level=4; }
            else if(latency<=5){ className='status-tag-light-yellow'; level=3; }
            else if(latency<=10){ className='status-tag-dark-yellow'; level=2; }
        }
        let bars = '';
        for(let i=1;i<=4;i++){
            bars += `<div class="signal-bar" style="height:${i*25}%;background-color:${i<=level?'white':'rgba(255,255,255,0.3)'}"></div>`;
        }
        return `<div class="status-tag ${className}"><div class="signal">${bars}</div>${text}</div>`;
    }

    function applyData(data){
        const linkStatus = data.link_status;

        // 失效链接
        const invalidLinks = linkStatus.filter(item=>item.latency===-1);
        const invalidSection = document.getElementById('invalid-links-section');
        if(invalidLinks.length>0){
            let html = `<h2>😭 失效暂留 · 临时的别离，只为更美的重逢（${invalidLinks.length}）</h2><div class="telescopic-site-card-group">`;
            invalidLinks.forEach(item=>{
                html += `
                <div class="site-card" style="position:relative;">
                    <a class="img no-text-decoration" target="_blank" title="${item.name}" href="${item.link}" rel="external nofollow">
                        <img class="flink-avatar" src="${placeholderSiteshot}" alt="${item.name}" onerror="this.onerror=null;this.src='${placeholderSiteshot}'">
                    </a>
                    <a class="info cf-friends-link no-text-decoration" target="_blank" title="${item.name}" href="${item.link}" rel="external nofollow">
                        <div class="site-card-avatar">
                            <div data-fancybox="gallery" data-caption="${item.name}" data-thumb="${item.avatar}">
                                <img class="flink-avatar cf-friends-avatar" src="${item.avatar}" alt="${item.name}" onerror="this.onerror=null;this.src='${placeholderSiteshot}'">
                            </div>
                        </div>
                        <div class="site-card-text">
                            <span class="title cf-friends-name">${item.name}</span>
                            <span class="desc" title="${item.descr || ''}">${item.descr || ''}</span>
                        </div>
                    </a>
                    ${createStatusTag(item.latency)}
                </div>`;
            });
            html += `</div>`;
            invalidSection.innerHTML = html;
        }

        // 正常链接
        document.querySelectorAll('.site-card').forEach(card=>{
            const linkEl = card.querySelector('a.info.cf-friends-link');
            if(!linkEl || !linkEl.href) return;
            const decodedLink = decodeGoUrl(linkEl.href).replace(/\/$/,'');
            const status = linkStatus.find(item=>item.link.replace(/\/$/,'')===decodedLink);
            if(!status) return;

            const oldTag = card.querySelector('.status-tag');
            if(oldTag) oldTag.remove();

            card.style.position='relative';
            card.insertAdjacentHTML('beforeend', createStatusTag(status.latency));
        });
    }

    function fetchAndRender(force=false){
        if(force) localStorage.removeItem(cacheKey);
        const cached = localStorage.getItem(cacheKey);
        if(cached && !force){
            const {data,timestamp}=JSON.parse(cached);
            if(Date.now()-timestamp<cacheExpire){ applyData(data); return; }
        }

        fetch(jsonUrl)
        .then(res=>res.json())
        .then(data=>{
            localStorage.setItem(cacheKey, JSON.stringify({data,timestamp:Date.now()}));
            applyData(data);
        })
        .catch(err=>console.error(err));
    }

    return fetchAndRender;
}

const refreshLinks = renderLinksWithStatus('https://link.lxb.icu/result.json');
setTimeout(()=>refreshLinks(),0);
</script>

<br>


```

## 总结
虽然这个方式有缺陷，但也在很大程度上减少了我们的工作量，可以不用手动一个个检测了。自动化的检测流程不仅节约了大量时间，还提高了检测的一致性和准确性。通过脚本，我们可以快速地对大量链接进行批量检查，及时地发现问题并进行相应的处理。此外，自动化测试可以很容易地集成到持续集成/持续部署（CI/CD）的流程中，确保在软件开发周期的早期阶段就能识别和修复问题。尽管存在一些局限性，但通过适当的配置和优化，我们可以最大限度地减少这些缺陷的影响，同时享受自动化带来的便利。
