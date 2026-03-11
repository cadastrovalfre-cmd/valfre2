export default async function handler(req, res) {

try {

const page = Number(req.query.page || 1)

const url =
"https://1225878.commercesuite.com.br/web_api/products" +
"?limit=50&page=" +
page +
"&include=ProductStock,ProductImage,ProductVariant,ProductVariantValue,ProductDescription"

const response = await fetch(url,{
method:"GET",
headers:{
Accept:"application/json"
}
})

if(!response.ok){
console.error("TRAY API HTTP ERROR:",response.status,response.statusText)
return res.status(200).json([])
}

const data = await response.json()

if(!data || !Array.isArray(data.Products)){
return res.status(200).json([])
}

const toNumber = (value)=>{
const n = Number(value)
return Number.isFinite(n) ? n : 0
}

const toBool = (value)=>{
return value === true || value === 1 || value === "1"
}

const pickFirstText = (...values)=>{
for(const v of values){
if(typeof v === "string" && v.trim() !== "") return v
}
return ""
}

const products = data.Products.map((item)=>{

const p = item?.Product || {}


// =========================
// IMAGEM
// =========================

let image = null

if(Array.isArray(p.ProductImage) && p.ProductImage.length > 0){

const firstImg = p.ProductImage[0] || {}

image =
firstImg.https ||
firstImg.http ||
firstImg.src ||
firstImg.url ||
null

}

if(!image){

image =
p.main_image ||
p.image ||
p.image_url ||
null

}


// =========================
// DESCRIÇÃO
// =========================

const description = pickFirstText(
p.description_full,
p.description,
p.ProductDescription?.description,
p.ProductDescription?.description_full,
p.ProductDescription?.descriptionHtml,
p.ProductDescription?.html,
p.description_small
)


// =========================
// VARIAÇÕES
// =========================

let variants = []

if(Array.isArray(p.ProductVariant) && p.ProductVariant.length > 0){

variants = p.ProductVariant.map((v)=>{

const variantStock = toNumber(
v.stock ??
v.quantity ??
v.balance ??
v.available_stock ??
0
)

const variantName = pickFirstText(
v.name,
v.value,
v.title,
v.label,
v.VariantValue?.value,
v.VariantValue?.name,
v.Variant?.name
)

let variantImage =
v.image ||
v.image_url ||
v.src ||
null

if(!variantImage && Array.isArray(v.images) && v.images.length > 0){

variantImage =
v.images[0]?.https ||
v.images[0]?.http ||
v.images[0]?.src ||
null

}

return{

id: toNumber(v.id),

name: variantName,

stock: variantStock,

price: toNumber(v.price || p.price),

promotional_price: toNumber(
v.promotional_price || p.promotional_price
),

available:
toBool(v.available) ||
variantStock > 0,

image: variantImage

}

}).filter(v => v.id || v.name)

}

const hasVariations =
toBool(p.has_variations) ||
variants.length > 0


// =========================
// ESTOQUE
// =========================

let stock = 0

if(Array.isArray(p.ProductStock) && p.ProductStock.length > 0){

stock = p.ProductStock.reduce((total,s)=>{

return total + toNumber(
s.quantity ??
s.stock ??
s.balance ??
0
)

},0)

}

if(stock === 0){

stock = toNumber(
p.stock ??
p.quantity ??
p.balance ??
p.available_stock ??
0
)

}

if(stock === 0 && variants.length > 0){

stock = variants.reduce((total,v)=>{

return total + toNumber(v.stock)

},0)

}


// =========================
// DISPONIBILIDADE
// =========================

const available =
toBool(p.available) ||
stock > 0 ||
hasVariations


// =========================
// RETURN FINAL
// =========================

return{

id: toNumber(p.id),

name: p.name || "",

price: toNumber(p.price),

promotional_price: toNumber(p.promotional_price),

brand: p.brand || "",

category_id: toNumber(p.category_id),

stock: stock,

available: available,

has_variations: hasVariations,

variants: variants,

description: description,

description_small: p.description_small || "",

model: p.model || "",

weight: p.weight || "",

warranty: p.warranty || "",

reference: p.reference || "",

ean: p.ean || "",

slug: p.slug || "",

image: image

}

})

return res.status(200).json(products)

}catch(error){

console.error("TRAY API ERROR:",error)

return res.status(500).json([])

}

}
