import https from 'https';

// Validation
if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is missing from environment variables');
    process.exit(1);
}

const options = {
    hostname: 'api.resend.com',
    port: 443,
    path: '/domains',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (res.statusCode === 200) {
                console.log('✅ Resend Domains:');
                if (json.data && json.data.length > 0) {
                    json.data.forEach(domain => {
                        console.log(`\nDomain: ${domain.name}`);
                        console.log(`ID: ${domain.id}`);
                        console.log(`Status: ${domain.status} ${domain.status === 'verified' ? '✅' : '❌'}`);
                        console.log(`Created: ${domain.created_at}`);
                        console.log(`Region: ${domain.region}`);
                    });
                } else {
                    console.log('⚠️ No domains found in Resend configuration.');
                }
            } else {
                console.error(`❌ Failed to fetch domains: ${res.statusCode}`);
                console.error(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error('Error parsing response:', e);
            console.log('Raw data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.end();
