const crypto = require("crypto");

function base64Url(str) {
	return Buffer.from(str)
		.toString("base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

function sign(payload, secret) {
	const header = { alg: "HS256", typ: "JWT" };
	const encodedHeader = base64Url(JSON.stringify(header));
	const encodedPayload = base64Url(JSON.stringify(payload));
	const signatureInput = `${encodedHeader}.${encodedPayload}`;
	const signature = crypto
		.createHmac("sha256", secret)
		.update(signatureInput)
		.digest("base64");
	// Convert signature to base64url
	const encodedSignature = signature
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
	return `${signatureInput}.${encodedSignature}`;
}

// 1. Generate a strong random secret (32 bytes = 64 hex chars)
const secret = crypto.randomBytes(40).toString("hex");

// 2. Define payloads for Supabase roles (valid for 10 years)
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 315360000; // ~10 years

const anonPayload = {
	role: "anon",
	iss: "supabase",
	iat: iat,
	exp: exp,
};

const servicePayload = {
	role: "service_role",
	iss: "supabase",
	iat: iat,
	exp: exp,
};

console.log("--- COPY THESE TO YOUR .env FILE ---");
console.log("");
console.log(`POSTGRES_PASSWORD=${crypto.randomBytes(16).toString("hex")}`);
console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign(anonPayload, secret)}`);
console.log(`SERVICE_ROLE_KEY=${sign(servicePayload, secret)}`);
console.log("");
console.log("--- END ---");
