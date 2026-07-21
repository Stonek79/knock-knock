const crypto = require('crypto');

function generateWGKeypair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519');
    
    // WireGuard использует сырые 32 байта для ключей x25519 (Curve25519).
    // Node.js экспортирует их в форматах DER. Последние 32 байта — это и есть сырой ключ.
    const pubDer = publicKey.export({ type: 'spki', format: 'der' });
    const rawPub = pubDer.subarray(pubDer.length - 32);
    
    const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
    const rawPriv = privDer.subarray(privDer.length - 32);
    
    return { 
        priv: rawPriv.toString('base64'), 
        pub: rawPub.toString('base64') 
    };
}

console.log("=== Генерация ключей WireGuard ===");

const vpsKeys = generateWGKeypair();
const homeKeys = generateWGKeypair();

console.log("\n[Ключи для сервера Ninja (VPS wg01.conf)]");
console.log(`PrivateKey = ${vpsKeys.priv}`);
console.log(`PublicKey  = ${vpsKeys.pub}`);

console.log("\n[Ключи для Домашнего сервера (Добавьте эти строки в .env на домашнем сервере)]");
console.log(`HOME_WG_PRIV=${homeKeys.priv}`);
console.log(`VPS_WG_PUB=${vpsKeys.pub}`);

console.log("\nВнимание: PublicKey домашнего сервера нужно прописать в конфиге VPS!");
console.log(`PublicKey Домашнего сервера = ${homeKeys.pub}`);
