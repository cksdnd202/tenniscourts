import { fetchBlogPreview } from "../src/lib/blogPreview.ts";

const urls = process.argv.slice(2);
if (!urls.length) throw new Error("미리보기할 URL을 인자로 넘겨주세요.");

const previews = [];
for (const url of urls) previews.push(await fetchBlogPreview({ url }));
console.log(JSON.stringify(previews, null, 2));
