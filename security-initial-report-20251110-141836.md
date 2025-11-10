# Initial Security Report - Mon Nov 10 14:18:36 CST 2025

## System Information
- Project: thelostandunfounds
- Domain: www.thelostandunfounds.com
- Report Generated: Mon Nov 10 14:18:36 CST 2025

## Dependency Security
```
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "esbuild": {
      "name": "esbuild",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        {
          "source": 1102341,
          "name": "esbuild",
          "dependency": "esbuild",
          "title": "esbuild enables any website to send any requests to the development server and read the response",
          "url": "https://github.com/advisories/GHSA-67mh-4wv8-2f99",
          "severity": "moderate",
          "cwe": [
            "CWE-346"
          ],
          "cvss": {
            "score": 5.3,
```

## Secret Exposure Check
- Service Role Keys: ✅ Not found
- Turnstile Secrets: ✅ Not found

## Environment Variables
- .env file in repo: ⚠️  Found
- .env in .gitignore: ✅ Yes

## Next Steps
1. Review npm audit output
2. Address any CRITICAL findings immediately
3. Set up automated security monitoring
4. Configure security agents as per SECURITY_MONITORING_SYSTEM.md

