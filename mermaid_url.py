import json
import zlib
import base64

code = """erDiagram
    User {
        Int id PK
        String email
        String password
        String name
        String role
        Int parentId FK
        Int customRoleId FK
        Int maxRam
        Int maxDisk
        Int maxProjects
        Int maxDatabases
        DateTime createdAt
    }

    CustomRole {
        Int id PK
        String name
        StringArray permissions
        Boolean assignableByManager
        Int ownerId FK
        DateTime createdAt
    }

    Project {
        Int id PK
        String name
        String containerId
        String status
        Int ramLimit
        Float cpuLimit
        Int hostPort
        String subdomain
        String customDomain
        String sslStatus
        DateTime sslExpiry
        String gitRepo
        String deployBranch
        String gitToken
        String deployStatus
        DateTime lastDeployedAt
        String restartPolicy
        Boolean autoScale
        Boolean notificationsEnabled
        String volumeMapping
        String slackWebhook
        Int alertInterval
        Int userId FK
        DateTime createdAt
    }

    ProjectMember {
        Int id PK
        Int userId FK
        Int projectId FK
        String role
        StringArray permissions
        DateTime createdAt
    }

    EnvVariable {
        Int id PK
        String key
        String value
        Boolean isSecret
        Int projectId FK
        DateTime createdAt
    }

    DeploymentLog {
        Int id PK
        Int projectId FK
        String trigger
        String status
        String gitCommit
        String gitMessage
        Int duration
        Text log
        DateTime createdAt
    }

    ActivityLog {
        Int id PK
        Int projectId FK
        String type
        String message
        DateTime createdAt
    }

    ProjectStat {
        Int id PK
        Int projectId FK
        Float cpuUsage
        Float ramUsage
        DateTime createdAt
    }

    DatabaseInstance {
        Int id PK
        String name
        String type
        String status
        String connectionString
        Int projectId FK
        DateTime createdAt
    }

    DatabaseActivityLog {
        Int id PK
        Int databaseId FK
        String action
        String filename
        String status
        Text message
        DateTime createdAt
    }

    User ||--o{ User : "parentId"
    User ||--o{ CustomRole : "ownerId"
    CustomRole ||--o{ User : "customRoleId"
    User ||--o{ Project : "userId"
    User ||--o{ ProjectMember : "userId"
    Project ||--o{ ProjectMember : "projectId"
    Project ||--o{ EnvVariable : "projectId"
    Project ||--o{ DeploymentLog : "projectId"
    Project ||--o{ ActivityLog : "projectId"
    Project ||--o{ ProjectStat : "projectId"
    Project ||--o{ DatabaseInstance : "projectId"
    DatabaseInstance ||--o{ DatabaseActivityLog : "databaseId"
"""

state = {
    "code": code,
    "mermaid": '{\n  "theme": "default"\n}',
    "autoSync": True,
    "updateDiagram": True
}

data = json.dumps(state).encode('utf-8')
compressed = zlib.compress(data)[2:-4] # zlib compress without header/footer is deflateRaw
b64 = base64.urlsafe_b64encode(compressed).decode('utf-8').rstrip('=')
print("https://mermaid.live/edit#pako:" + b64)
