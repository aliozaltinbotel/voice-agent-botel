# Azure Container Apps Log Diagnostic Queries

## 🔍 Essential Log Queries for Troubleshooting

### 1. **Recent Container Logs (Last 30 minutes)**
```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(30m)
| where ContainerAppName_s == "ca-media-worker-dev"
| order by TimeGenerated desc
| project TimeGenerated, Log_s, Stream_s
```

### 2. **Application Startup Logs**
```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where ContainerAppName_s == "ca-media-worker-dev"
| where Log_s contains "Media Worker" or Log_s contains "listening" or Log_s contains "started"
| order by TimeGenerated desc
| project TimeGenerated, Log_s
```

### 3. **Error Logs**
```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where ContainerAppName_s == "ca-media-worker-dev"
| where Log_s contains "error" or Log_s contains "Error" or Log_s contains "ERROR"
| order by TimeGenerated desc
| project TimeGenerated, Log_s, Stream_s
```

### 4. **Port and Network Issues**
```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where ContainerAppName_s == "ca-media-worker-dev"
| where Log_s contains "port" or Log_s contains "listen" or Log_s contains "EADDRINUSE" or Log_s contains "bind"
| order by TimeGenerated desc
| project TimeGenerated, Log_s
```

### 5. **Environment Variables Issues**
```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where ContainerAppName_s == "ca-media-worker-dev"
| where Log_s contains "undefined" or Log_s contains "missing" or Log_s contains "env"
| order by TimeGenerated desc
| project TimeGenerated, Log_s
```

### 6. **Health Check Logs**
```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(30m)
| where ContainerAppName_s == "ca-media-worker-dev"
| where Log_s contains "health" or Log_s contains "/health"
| order by TimeGenerated desc
| project TimeGenerated, Log_s
```

### 7. **Container Restart Events**
```kusto
ContainerAppSystemLogs_CL
| where TimeGenerated > ago(2h)
| where ContainerAppName_s == "ca-media-worker-dev"
| where Log_s contains "restart" or Log_s contains "exit" or Log_s contains "killed"
| order by TimeGenerated desc
| project TimeGenerated, Log_s, Reason_s
```

## 🚨 **Common Issues to Look For:**

### **Port Configuration Issues:**
- Look for: `EADDRINUSE`, `port already in use`, `listen EADDRINUSE`
- **Solution**: Container should listen on port 8080

### **Environment Variables Missing:**
- Look for: `undefined`, `missing environment variable`, `config error`
- **Solution**: Check Container App environment variables

### **Application Startup Failures:**
- Look for: `Cannot find module`, `SyntaxError`, `ReferenceError`
- **Solution**: Check if all dependencies are installed in container

### **Memory/Resource Issues:**
- Look for: `out of memory`, `killed`, `OOMKilled`
- **Solution**: Increase container memory allocation

### **Network/DNS Issues:**
- Look for: `ENOTFOUND`, `connection refused`, `timeout`
- **Solution**: Check Azure service endpoints and networking

## 📋 **What to Share:**

After running these queries, please share:

1. **Any ERROR messages** from the last hour
2. **Startup logs** showing if the app started successfully
3. **Port binding logs** showing if it's listening on 8080
4. **Recent container restart events**

## 🔧 **Quick Fixes Based on Common Issues:**

### If you see port issues:
- Container should listen on `process.env.PORT || 8080`

### If you see missing environment variables:
- Check Container App → Settings → Environment variables

### If you see module not found:
- Container build might have failed - check GitHub Actions

### If you see memory issues:
- Increase container memory in Container App settings 