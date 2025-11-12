# Verana Visualizer - System Architecture

## Overview

The Verana Visualizer is a Next.js application that provides an interactive interface for exploring the Verana blockchain network. It fetches real-time and historical data from the Verana REST API and RPC endpoints to visualize network statistics, trust registries, DIDs, and relationships through interactive charts and 3D graphs.

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Client Browser"]
        UI[React UI Components]
        Charts[Recharts Components]
        Graph[3D Force Graph]
    end
    
    subgraph NextJS["Next.js 15 Application"]
        Pages[App Router Pages]
        Components[React Components]
        Lib[Utility Libraries]
        Types[TypeScript Types]
    end
    
    subgraph DataLayer["Data Fetching Layer"]
        API[API Client]
        Historical[Historical Data Fetcher]
        Cache[Browser Cache]
    end
    
    subgraph External["Verana Network"]
        REST[REST API<br/>api.testnet.verana.network]
        RPC[RPC Endpoint<br/>rpc.testnet.verana.network]
        Blockchain[(Blockchain State)]
    end
    
    Client --> NextJS
    NextJS --> DataLayer
    DataLayer --> External
    
    REST --> Blockchain
    RPC --> Blockchain
    
    style Client fill:#3b82f6,stroke:#1e40af,color:#fff
    style NextJS fill:#10b981,stroke:#059669,color:#fff
    style DataLayer fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style External fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## Application Structure

```mermaid
flowchart TD
    Root[Root Layout<br/>src/app/layout.tsx]
    
    Root --> Dashboard[Dashboard<br/>/dashboard]
    Root --> Charts[Analytics Charts<br/>/charts]
    Root --> Network[Network Graph<br/>/network-graph]
    Root --> TrustReg[Trust Registries<br/>/trust-registries]
    Root --> DIDDir[DID Directory<br/>/did-directory]
    
    Dashboard --> DashCards[Enhanced Dashboard Cards]
    Dashboard --> RefreshBtn[Refresh Button]
    
    Charts --> TokenChart[Token Supply Chart]
    Charts --> InflationChart[Inflation Chart]
    Charts --> ValidatorChart[Validator Distribution]
    Charts --> StakingChart[Staking Distribution]
    Charts --> ActivityChart[Network Activity]
    
    Network --> Graph3D[3D Force Graph Wrapper]
    Graph3D --> ForceGraph[Three.js Renderer]
    
    TrustReg --> TrustTable[Trust Registry Table]
    DIDDir --> DIDTable[DID Table]
    
    Root --> Sidebar[Sidebar Navigation]
    Root --> Header[Header Component]
    Root --> Footer[Footer Component]
    Root --> Theme[Theme Toggle]
    
    style Root fill:#1f2937,stroke:#111827,color:#fff
    style Charts fill:#10b981,stroke:#059669,color:#fff
    style Dashboard fill:#3b82f6,stroke:#2563eb,color:#fff
    style Network fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## Charts Data Flow - Historical Data Fetching

```mermaid
sequenceDiagram
    participant User
    participant ChartsPage
    participant HistFetcher as Historical<br/>Data Fetcher
    participant RPC as RPC Endpoint
    participant API as REST API
    participant Chain as Blockchain
    
    User->>ChartsPage: Navigate to /charts
    ChartsPage->>ChartsPage: Show loading (0%)
    
    ChartsPage->>HistFetcher: getCurrentBlockHeight()
    HistFetcher->>RPC: GET /block
    RPC->>Chain: Query latest block
    Chain-->>RPC: Block data
    RPC-->>HistFetcher: height: 1,500,000
    HistFetcher-->>ChartsPage: Current height
    
    ChartsPage->>ChartsPage: Update progress (10%)
    ChartsPage->>HistFetcher: fetchHistoricalSupplyData(30)
    
    Note over HistFetcher: Calculate 30 historical heights<br/>1.5M, 1.48M, 1.46M, ..., 982K
    
    loop For each height (batched)
        HistFetcher->>API: GET /supply?height=X
        HistFetcher->>API: GET /pool?height=X
        HistFetcher->>RPC: GET /block?height=X
        API->>Chain: Query state at height X
        Chain-->>API: State data
        API-->>HistFetcher: Supply & pool data
        RPC-->>HistFetcher: Block timestamp
    end
    
    HistFetcher-->>ChartsPage: Historical supply array
    ChartsPage->>ChartsPage: Update progress (30%)
    
    ChartsPage->>HistFetcher: fetchHistoricalInflationData(30)
    loop For each height
        HistFetcher->>API: GET /inflation?height=X
        API-->>HistFetcher: Inflation rate
    end
    HistFetcher-->>ChartsPage: Historical inflation array
    
    ChartsPage->>ChartsPage: Update progress (50%)
    ChartsPage->>HistFetcher: fetchCurrentValidatorDistribution()
    HistFetcher->>API: GET /validators
    API-->>HistFetcher: Current validators
    HistFetcher-->>ChartsPage: Top 10 validators
    
    ChartsPage->>ChartsPage: Update progress (70%)
    ChartsPage->>HistFetcher: fetchCurrentStakingDistribution()
    HistFetcher->>API: GET /supply + GET /pool
    API-->>HistFetcher: Current state
    HistFetcher-->>ChartsPage: Distribution data
    
    ChartsPage->>ChartsPage: Update progress (90%)
    ChartsPage->>HistFetcher: fetchHistoricalNetworkActivity(30)
    loop For each height
        HistFetcher->>RPC: GET /block?height=X
        RPC-->>HistFetcher: Block with txs
    end
    HistFetcher-->>ChartsPage: Activity data
    
    ChartsPage->>ChartsPage: Update progress (100%)
    ChartsPage-->>User: Display all charts with real data
```

---

## Historical Data Algorithm

```mermaid
flowchart TD
    Start([Start: Fetch Historical Data]) --> GetHeight[Get Current Block Height]
    GetHeight --> CalcHeights[Calculate Historical Heights<br/>30 points over 30 days]
    
    CalcHeights --> Batch{More Batches?}
    
    Batch -->|Yes| SelectBatch[Select Next 5 Heights]
    SelectBatch --> ParallelFetch[Fetch Data in Parallel]
    
    subgraph Parallel["For Each Height in Batch"]
        F1[Query Supply<br/>?height=X]
        F2[Query Pool<br/>?height=X]
        F3[Query Block<br/>?height=X]
        F4[Query Inflation<br/>?height=X]
    end
    
    ParallelFetch --> Parallel
    Parallel --> Combine[Combine Results]
    Combine --> Wait[Wait 500ms]
    Wait --> Batch
    
    Batch -->|No| Sort[Sort by Height]
    Sort --> Transform[Transform to Chart Format]
    Transform --> Return([Return Data Array])
    
    style Start fill:#10b981,stroke:#059669,color:#fff
    style Return fill:#3b82f6,stroke:#2563eb,color:#fff
    style Parallel fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

### Height Calculation Example

```mermaid
gantt
    title 30-Day Historical Sampling
    dateFormat YYYY-MM-DD
    section Blocks
    Current Height (1.5M)       :a1, 2024-11-02, 1d
    -1 day (1.48M)              :a2, 2024-11-01, 1d
    -2 days (1.46M)             :a3, 2024-10-31, 1d
    -5 days (1.41M)             :a4, 2024-10-28, 1d
    -10 days (1.33M)            :a5, 2024-10-23, 1d
    -15 days (1.24M)            :a6, 2024-10-18, 1d
    -20 days (1.16M)            :a7, 2024-10-13, 1d
    -25 days (1.07M)            :a8, 2024-10-08, 1d
    -30 days (982K)             :a9, 2024-10-03, 1d
```

**Formula:**
```
blocks_per_day = 86400 / avg_block_time
blocks_per_day ≈ 17,280 (for 5s blocks)

height_at_day_N = current_height - (N × blocks_per_day)
```

---

## Component Architecture

```mermaid
flowchart TD
    subgraph Layout["Layout Layer"]
        LayoutWrapper[Layout Wrapper]
        Sidebar[Sidebar Navigation]
        Header[Header with Chain Info]
        Footer[Footer]
    end
    
    subgraph Pages["Page Components"]
        Dashboard[Dashboard Page]
        Charts[Charts Page]
        NetworkGraph[Network Graph Page]
        TrustReg[Trust Registry Page]
        DIDPage[DID Directory Page]
    end
    
    subgraph ChartComponents["Chart Components"]
        TokenSupply[Token Supply Chart<br/>Area Chart]
        Inflation[Inflation Chart<br/>Line Chart + Dual Y-Axis]
        Validators[Validator Distribution<br/>Bar Chart]
        Staking[Staking Distribution<br/>Pie Chart]
        Activity[Network Activity<br/>Composed Chart]
    end
    
    subgraph DataComponents["Data Display"]
        DashCards[Dashboard Cards]
        Graph3D[3D Force Graph]
        Tables[Data Tables]
    end
    
    subgraph Utils["Utilities"]
        API[API Client]
        HistFetch[Historical Fetcher]
        Formatters[Data Formatters]
    end
    
    Layout --> Pages
    Pages --> ChartComponents
    Pages --> DataComponents
    ChartComponents --> Utils
    DataComponents --> Utils
    
    style ChartComponents fill:#10b981,stroke:#059669,color:#fff
    style Utils fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## Data Fetching Strategy

### Current State Data

```mermaid
flowchart LR
    subgraph Components
        A[Dashboard Cards]
        B[Charts Current Data]
    end
    
    subgraph API["API Client"]
        F1[fetchSupply]
        F2[fetchInflation]
        F3[fetchStakingPool]
        F4[fetchValidators]
        F5[fetchProposals]
    end
    
    subgraph Endpoints
        E1[/cosmos/bank/v1beta1/supply]
        E2[/cosmos/mint/v1beta1/inflation]
        E3[/cosmos/staking/v1beta1/pool]
        E4[/cosmos/staking/v1beta1/validators]
        E5[/cosmos/gov/v1/proposals]
    end
    
    A --> F1 & F2 & F3 & F4 & F5
    B --> F1 & F2 & F3 & F4
    
    F1 --> E1
    F2 --> E2
    F3 --> E3
    F4 --> E4
    F5 --> E5
    
    E1 & E2 & E3 & E4 & E5 --> Network[(Verana Network)]
```

### Historical State Data

```mermaid
flowchart TD
    Charts[Charts Page] --> HistFetcher[Historical Data Fetcher]
    
    HistFetcher --> GetHeight{Get Current<br/>Block Height}
    GetHeight --> CalcHeights[Calculate<br/>30 Heights]
    
    CalcHeights --> Loop{For Each<br/>Height}
    
    Loop -->|Batch 1| H1[Heights: 1.5M to 1.41M]
    Loop -->|Batch 2| H2[Heights: 1.41M to 1.33M]
    Loop -->|Batch 3| H3[Heights: 1.33M to 1.24M]
    Loop -->|...| H4[...]
    Loop -->|Batch 6| H6[Heights: 1.07M to 982K]
    
    H1 & H2 & H3 & H4 & H6 --> Fetch[Query Endpoints<br/>with ?height=X]
    
    Fetch --> E1[/supply?height=X]
    Fetch --> E2[/pool?height=X]
    Fetch --> E3[/inflation?height=X]
    Fetch --> E4[/block?height=X]
    
    E1 & E2 & E3 & E4 --> Build[Build Time Series]
    Build --> Sort[Sort by Height]
    Sort --> Display[Display in Charts]
    
    style Charts fill:#3b82f6,stroke:#2563eb,color:#fff
    style HistFetcher fill:#10b981,stroke:#059669,color:#fff
    style Display fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## Chart Component Composition

### Token Supply Chart (Area Chart)

```mermaid
flowchart LR
    Data[Historical Data<br/>30 points] --> Chart[Token Supply Chart]
    
    Chart --> Container[ResponsiveContainer]
    Container --> AreaChart[AreaChart Component]
    
    AreaChart --> Grid[CartesianGrid]
    AreaChart --> XAxis[XAxis: Timestamps]
    AreaChart --> YAxis[YAxis: Token Amounts]
    AreaChart --> Tooltip[Tooltip: Hover Details]
    AreaChart --> Legend[Legend: Series Toggle]
    
    AreaChart --> Series1[Area: Total Supply<br/>Color: Blue<br/>Gradient Fill]
    AreaChart --> Series2[Area: Bonded Tokens<br/>Color: Green<br/>Gradient Fill]
    AreaChart --> Series3[Area: Unbonded Tokens<br/>Color: Amber<br/>Gradient Fill]
    
    style Chart fill:#3b82f6,stroke:#2563eb,color:#fff
    style AreaChart fill:#10b981,stroke:#059669,color:#fff
```

### Inflation Chart (Line Chart with Dual Y-Axis)

```mermaid
flowchart LR
    Data[Historical Data<br/>30 points] --> Chart[Inflation Chart]
    
    Chart --> Container[ResponsiveContainer]
    Container --> LineChart[LineChart Component]
    
    LineChart --> Grid[CartesianGrid]
    LineChart --> XAxis[XAxis: Timestamps]
    LineChart --> YLeft[YAxis Left:<br/>Inflation %]
    LineChart --> YRight[YAxis Right:<br/>Provisions]
    LineChart --> Tooltip[Tooltip:<br/>Dual Values]
    LineChart --> Legend[Legend]
    
    LineChart --> L1[Line: Inflation Rate<br/>Color: Red<br/>Y-Axis: Left]
    LineChart --> L2[Line: Annual Provisions<br/>Color: Purple<br/>Y-Axis: Right]
    
    style Chart fill:#ef4444,stroke:#dc2626,color:#fff
    style LineChart fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## Page Routing & Navigation

```mermaid
stateDiagram-v2
    [*] --> Home: User visits site
    Home --> Dashboard: Redirect /
    
    Dashboard --> Charts: Click Analytics
    Dashboard --> NetworkGraph: Click Network Graph
    Dashboard --> TrustRegistries: Click Trust Registries
    Dashboard --> DIDDirectory: Click DID Directory
    
    Charts --> Dashboard: Click Dashboard
    NetworkGraph --> Dashboard: Click Dashboard
    TrustRegistries --> Dashboard: Click Dashboard
    DIDDirectory --> Dashboard: Click Dashboard
    
    Charts --> NetworkGraph: Navigate
    NetworkGraph --> TrustRegistries: Navigate
    TrustRegistries --> DIDDirectory: Navigate
    DIDDirectory --> Charts: Navigate
    
    state Dashboard {
        [*] --> LoadData
        LoadData --> DisplayCards
        DisplayCards --> AutoRefresh
        AutoRefresh --> LoadData: Every 30s
    }
    
    state Charts {
        [*] --> FetchHistorical
        FetchHistorical --> ShowProgress
        ShowProgress --> RenderCharts
    }
```

---

## Data Transformation Pipeline

### Token Supply Chart Data Pipeline

```mermaid
flowchart TB
    Start([Start]) --> FetchHeight[Fetch Current Height<br/>RPC: /block]
    
    FetchHeight --> CalcHeights[Calculate Heights<br/>30 points × 17,280 blocks]
    
    CalcHeights --> BatchLoop{Process<br/>Batch?}
    
    BatchLoop -->|Yes| SelectBatch[Select 5 Heights]
    
    SelectBatch --> Parallel1[Parallel Fetch]
    
    subgraph Batch["For Each of 5 Heights"]
        Q1[GET /supply?height=X<br/>→ total_supply]
        Q2[GET /pool?height=X<br/>→ bonded, not_bonded]
        Q3[GET /block?height=X<br/>→ timestamp]
    end
    
    Parallel1 --> Batch
    Batch --> Combine[Combine Data Point]
    
    Combine --> Point["Data Point {<br/>timestamp: 'Nov 2'<br/>height: 1500000<br/>supply: 1000000000<br/>bonded: 800000000<br/>unbonded: 200000000<br/>}"]
    
    Point --> Delay[Wait 500ms]
    Delay --> BatchLoop
    
    BatchLoop -->|No| Aggregate[Aggregate All Points]
    Aggregate --> Sort[Sort by Height]
    Sort --> Format[Format for Display]
    
    Format --> ChartData["Chart Data Array<br/>[30 points]"]
    ChartData --> Render[Render Area Chart]
    Render --> End([Display])
    
    style Start fill:#10b981,stroke:#059669,color:#fff
    style End fill:#3b82f6,stroke:#2563eb,color:#fff
    style ChartData fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## API Integration Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend Application"]
        Pages[Pages]
        Components[Components]
    end
    
    subgraph DataLayer["Data Fetching Layer"]
        APIClient[API Client<br/>src/lib/api.ts]
        HistFetcher[Historical Fetcher<br/>src/lib/historicalDataFetcher.ts]
    end
    
    subgraph Endpoints["Verana Network Endpoints"]
        direction TB
        
        subgraph REST["REST API (api.testnet.verana.network)"]
            R1[/cosmos/bank/v1beta1/*]
            R2[/cosmos/staking/v1beta1/*]
            R3[/cosmos/mint/v1beta1/*]
            R4[/cosmos/gov/v1/*]
            R5[/verana/tr/v1/*]
            R6[/verana/dd/v1/*]
        end
        
        subgraph RPC["RPC (rpc.testnet.verana.network)"]
            P1[/block]
            P2[/block?height=X]
            P3[/abci_info]
            P4[/genesis]
        end
    end
    
    Frontend --> DataLayer
    
    APIClient --> REST
    HistFetcher --> REST
    HistFetcher --> RPC
    
    REST --> Chain[(Blockchain<br/>State)]
    RPC --> Chain
    
    style Frontend fill:#3b82f6,stroke:#2563eb,color:#fff
    style DataLayer fill:#10b981,stroke:#059669,color:#fff
    style Endpoints fill:#f59e0b,stroke:#d97706,color:#fff
    style Chain fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## Network Graph 3D Visualization

```mermaid
flowchart TD
    Page[Network Graph Page] --> FetchData[Fetch Network Data]
    
    FetchData --> DIDs[Fetch DIDs<br/>/verana/dd/v1/list]
    FetchData --> TRs[Fetch Trust Registries<br/>/verana/tr/v1/list]
    
    DIDs --> BuildNodes[Build Graph Nodes]
    TRs --> BuildNodes
    
    BuildNodes --> Node1[DID Nodes<br/>Color: Blue<br/>Size: Small]
    BuildNodes --> Node2[TR Nodes<br/>Color: Green<br/>Size: Large]
    
    BuildNodes --> BuildLinks[Build Graph Links]
    
    BuildLinks --> Link1[TR → DID Links]
    BuildLinks --> Link2[DID → DID Links]
    
    Node1 & Node2 & Link1 & Link2 --> GraphData[Graph Data Structure]
    
    GraphData --> ForceGraph[3D Force Graph]
    
    ForceGraph --> Physics[Force-Directed<br/>Layout Engine]
    Physics --> Render[Three.js Renderer]
    
    Render --> Display[3D WebGL Canvas]
    
    Display --> Interact{User<br/>Interaction}
    Interact -->|Click Node| ShowPanel[Show Details Panel]
    Interact -->|Drag| Pan[Pan Camera]
    Interact -->|Scroll| Zoom[Zoom In/Out]
    Interact -->|Rotate| Rotate[Rotate View]
    
    style Page fill:#3b82f6,stroke:#2563eb,color:#fff
    style ForceGraph fill:#10b981,stroke:#059669,color:#fff
    style Display fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## State Management

```mermaid
flowchart TD
    subgraph ClientState["Client-Side State (React useState)"]
        ChartData[Chart Data Arrays]
        LoadingState[Loading States]
        ErrorState[Error States]
        UIState[UI State<br/>sidebar, theme, etc]
    end
    
    subgraph Effects["React useEffect Hooks"]
        InitialLoad[Initial Data Load]
        AutoRefresh[Auto-Refresh Timer]
        ThemeSync[Theme Persistence]
    end
    
    subgraph Actions["User Actions"]
        Navigate[Page Navigation]
        Refresh[Manual Refresh]
        Toggle[Toggle Theme]
        Interact[Chart Interaction]
    end
    
    Actions --> Effects
    Effects --> DataFetch[Fetch from API]
    DataFetch --> ChartData
    
    ChartData --> Render[Re-render Components]
    LoadingState --> Render
    ErrorState --> Render
    UIState --> Render
    
    style ClientState fill:#3b82f6,stroke:#2563eb,color:#fff
    style Effects fill:#10b981,stroke:#059669,color:#fff
    style Actions fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## Error Handling & Recovery

```mermaid
flowchart TD
    Request[API Request] --> Try{Try Fetch}
    
    Try -->|Success| Parse[Parse JSON]
    Try -->|Network Error| NetError[Network Error]
    Try -->|HTTP Error| HTTPError[HTTP Error]
    Try -->|Timeout| TimeoutError[Timeout Error]
    
    Parse -->|Valid| ExtractData[Extract Data]
    Parse -->|Invalid JSON| ParseError[Parse Error]
    
    ExtractData -->|Has Data| Transform[Transform Data]
    ExtractData -->|Empty| EmptyError[Empty Response]
    
    Transform --> Success[Return Data]
    
    NetError --> Log1[Console.error]
    HTTPError --> Log2[Console.error]
    TimeoutError --> Log3[Console.error]
    ParseError --> Log4[Console.error]
    EmptyError --> Log5[Console.warn]
    
    Log1 & Log2 & Log3 & Log4 & Log5 --> SetError[Set Error State]
    SetError --> ShowError[Display Error Message]
    
    Success --> UpdateState[Update Component State]
    UpdateState --> RenderChart[Render Chart]
    
    ShowError --> EmptyState[Show Empty State]
    
    style Success fill:#10b981,stroke:#059669,color:#fff
    style SetError fill:#ef4444,stroke:#dc2626,color:#fff
    style RenderChart fill:#3b82f6,stroke:#2563eb,color:#fff
```

---

## Performance Optimization Strategy

```mermaid
flowchart TD
    subgraph Request["Request Optimization"]
        Batch[Batch Requests<br/>5 at a time]
        Delay[500ms Between Batches]
        Parallel[Parallel Fetch<br/>per Height]
    end
    
    subgraph Rendering["Rendering Optimization"]
        Responsive[ResponsiveContainer<br/>Prevents Re-render]
        Memo[React.memo<br/>Chart Components]
        Lazy[Lazy Load<br/>Heavy Components]
    end
    
    subgraph Future["Future Optimization"]
        Cache[Client-Side Cache<br/>localStorage]
        Prefetch[Background Prefetch]
        ServiceWorker[Service Worker<br/>Offline Support]
        CDN[CDN for Static Assets]
    end
    
    Request --> Fast1[Faster Initial Load]
    Rendering --> Fast2[Faster Interactions]
    Future --> Fast3[Instant Subsequent Loads]
    
    Fast1 & Fast2 & Fast3 --> Target[Target: < 5s Load Time]
    
    style Request fill:#10b981,stroke:#059669,color:#fff
    style Rendering fill:#3b82f6,stroke:#2563eb,color:#fff
    style Future fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Target fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Dev["Development"]
        DevServer[npm run dev<br/>localhost:3000]
    end
    
    subgraph Build["Build Process"]
        NextBuild[next build<br/>Standalone Output]
        Optimize[Optimize Assets<br/>Tree-shaking, Minify]
    end
    
    subgraph Container["Docker Container"]
        MultiStage[Multi-Stage Build]
        Alpine[Alpine Linux Base]
        NodeServer[Node.js Server]
    end
    
    subgraph K8s["Kubernetes Deployment"]
        Deploy[Deployment<br/>2+ Replicas]
        Service[LoadBalancer Service]
        Ingress[Ingress<br/>vis.testnet.verana.network]
        HPA[HorizontalPodAutoscaler]
    end
    
    subgraph Helm["Helm Chart"]
        Chart[verana-visualizer<br/>Chart]
        Values[values.yaml<br/>Configuration]
    end
    
    Dev --> Build
    Build --> Container
    Container --> K8s
    Helm --> K8s
    
    K8s --> CDN[CDN<br/>Static Assets]
    K8s --> Users[End Users]
    
    style Dev fill:#3b82f6,stroke:#2563eb,color:#fff
    style Container fill:#10b981,stroke:#059669,color:#fff
    style K8s fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Helm fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## Technology Stack

```mermaid
mindmap
  root((Verana<br/>Visualizer))
    Frontend
      Next.js 15
        App Router
        Server Components
        Standalone Output
      React 18
        Hooks
        Client Components
        Concurrent Features
      TypeScript 5
        Strict Mode
        Path Aliases
        Type Safety
    Visualization
      Recharts 2.15
        Area Charts
        Line Charts
        Bar Charts
        Pie Charts
        Composed Charts
      3D Force Graph
        Three.js
        WebGL Rendering
        Force-Directed Layout
    Styling
      Tailwind CSS 3
        Dark Mode
        Responsive Design
        Custom Colors
      Custom CSS
        Global Styles
        Animations
    Testing
      Vitest
        Unit Tests
        Coverage Reports
      Testing Library
        Component Tests
        User Events
    DevOps
      Docker
        Multi-stage Build
        Alpine Base
      Kubernetes
        Deployments
        Services
        Ingress
      Helm
        Charts
        Values
```

---

## Data Types & Interfaces

```mermaid
classDiagram
    class TokenSupplyData {
        +string timestamp
        +number height
        +number supply
        +number bonded
        +number unbonded
    }
    
    class InflationData {
        +string timestamp
        +number height
        +number inflationRate
        +number annualProvisions
    }
    
    class ValidatorData {
        +string name
        +number votingPower
        +number commission
    }
    
    class StakingData {
        +string name
        +number value
    }
    
    class NetworkActivityData {
        +string timestamp
        +number height
        +number transactions
        +number blockTime
        +number gasUsed
    }
    
    class ChartComponent {
        +data: Array
        +isLoading: boolean
        +render() Chart
    }
    
    TokenSupplyData --> ChartComponent: feeds
    InflationData --> ChartComponent: feeds
    ValidatorData --> ChartComponent: feeds
    StakingData --> ChartComponent: feeds
    NetworkActivityData --> ChartComponent: feeds
```

---

## API Response Flow

```mermaid
sequenceDiagram
    autonumber
    participant App as Application
    participant Fetcher as Data Fetcher
    participant API as REST API
    participant RPC as RPC Endpoint
    participant Chain as Blockchain
    
    App->>Fetcher: Request historical data
    Fetcher->>RPC: GET /block
    RPC->>Chain: Query latest block
    Chain-->>RPC: Latest block data
    RPC-->>Fetcher: height: 1,500,000
    
    Note over Fetcher: Calculate 30 heights:<br/>1.5M, 1.48M, 1.46M, ..., 982K
    
    loop For each batch of 5 heights
        Fetcher->>API: GET /supply?height=H1
        Fetcher->>API: GET /supply?height=H2
        Fetcher->>API: GET /supply?height=H3
        Fetcher->>API: GET /supply?height=H4
        Fetcher->>API: GET /supply?height=H5
        
        API->>Chain: Query state at H1
        API->>Chain: Query state at H2
        API->>Chain: Query state at H3
        API->>Chain: Query state at H4
        API->>Chain: Query state at H5
        
        Chain-->>API: Historical states
        API-->>Fetcher: Supply data points
        
        Note over Fetcher: Wait 500ms before next batch
    end
    
    Fetcher-->>App: Complete historical array
    App->>App: Render charts
```

---

## User Interaction Flow

```mermaid
flowchart TD
    Start([User Opens App]) --> Load[Load Dashboard]
    
    Load --> SeeCards[View Network Cards]
    
    SeeCards --> Decision1{What Next?}
    
    Decision1 -->|View Trends| ClickCharts[Click Analytics]
    Decision1 -->|Explore Network| ClickGraph[Click Network Graph]
    Decision1 -->|Find TR| ClickTR[Click Trust Registries]
    Decision1 -->|Browse DIDs| ClickDID[Click DID Directory]
    
    ClickCharts --> LoadCharts[Load Charts Page]
    LoadCharts --> ShowProgress[Show Loading Progress]
    ShowProgress --> Wait[Wait 10-30s]
    Wait --> DisplayCharts[Display 5 Charts]
    
    DisplayCharts --> Interact{Interact}
    
    Interact -->|Hover| ShowTooltip[Show Detailed Tooltip]
    Interact -->|Click Legend| ToggleSeries[Toggle Data Series]
    Interact -->|Scroll| ExploreData[Explore Different Charts]
    
    ShowTooltip --> Insights[Gain Insights]
    ToggleSeries --> Compare[Compare Metrics]
    ExploreData --> Analyze[Analyze Trends]
    
    Insights & Compare & Analyze --> Decision2{Next Action?}
    
    Decision2 -->|Check Network| ClickGraph
    Decision2 -->|More Analysis| ExploreData
    Decision2 -->|Done| Leave[Leave App]
    
    style Start fill:#10b981,stroke:#059669,color:#fff
    style DisplayCharts fill:#3b82f6,stroke:#2563eb,color:#fff
    style Insights fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## Responsive Design Strategy

```mermaid
flowchart LR
    subgraph Mobile["Mobile (< 768px)"]
        M1[Collapsible Sidebar]
        M2[Stacked Charts]
        M3[Touch-Optimized]
        M4[Single Column]
    end
    
    subgraph Tablet["Tablet (768-1024px)"]
        T1[Partial Sidebar]
        T2[2-Column Grid]
        T3[Medium Charts]
        T4[Adaptive Layout]
    end
    
    subgraph Desktop["Desktop (> 1024px)"]
        D1[Full Sidebar]
        D2[Multi-Column Grid]
        D3[Large Charts]
        D4[Side-by-Side]
    end
    
    Mobile --> Breakpoints[Tailwind Breakpoints]
    Tablet --> Breakpoints
    Desktop --> Breakpoints
    
    Breakpoints --> CSS[Responsive CSS Classes]
    CSS --> Render[Optimal Rendering]
    
    style Mobile fill:#3b82f6,stroke:#2563eb,color:#fff
    style Tablet fill:#10b981,stroke:#059669,color:#fff
    style Desktop fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## Dark Mode Implementation

```mermaid
flowchart TD
    User[User Toggles Theme] --> Toggle[Theme Toggle Component]
    
    Toggle --> Check{Current<br/>Theme?}
    
    Check -->|Light| SetDark[Set to Dark]
    Check -->|Dark| SetLight[Set to Light]
    
    SetDark --> AddClass[Add 'dark' class to HTML]
    SetLight --> RemoveClass[Remove 'dark' class]
    
    AddClass --> SavePref[Save to localStorage]
    RemoveClass --> SavePref
    
    SavePref --> TriggerRerender[Trigger Re-render]
    
    TriggerRerender --> ApplyDark[Apply Dark Variants]
    
    subgraph DarkVariants["Dark Mode Variants"]
        BG[dark:bg-gray-900]
        Text[dark:text-white]
        Border[dark:border-gray-700]
        Charts[Custom Chart Colors]
    end
    
    ApplyDark --> DarkVariants
    DarkVariants --> Display[Display with Theme]
    
    style Toggle fill:#3b82f6,stroke:#2563eb,color:#fff
    style DarkVariants fill:#1f2937,stroke:#111827,color:#fff
```

---

## Build & Deployment Pipeline

```mermaid
flowchart LR
    subgraph Source["Source Code"]
        Code[TypeScript/React Code]
        Styles[Tailwind CSS]
        Assets[Static Assets]
    end
    
    subgraph Build["Next.js Build"]
        Compile[TypeScript Compilation]
        Bundle[Webpack Bundling]
        Optimize[Tree-shaking & Minify]
        Generate[Generate Static Files]
    end
    
    subgraph Output["Build Output"]
        Standalone[Standalone Server]
        Static[Static Assets]
        Server[Server Files]
    end
    
    subgraph Docker["Docker Image"]
        BaseImage[Node Alpine]
        CopyFiles[Copy Build Output]
        SetEnv[Set Environment]
        Expose[Expose Port 3000]
    end
    
    subgraph Deploy["Deployment"]
        Push[Push to Registry]
        K8s[Kubernetes Apply]
        Rollout[Rolling Update]
        Health[Health Checks]
    end
    
    Source --> Build
    Build --> Output
    Output --> Docker
    Docker --> Deploy
    
    Deploy --> Live[Live Application]
    
    style Build fill:#3b82f6,stroke:#2563eb,color:#fff
    style Docker fill:#10b981,stroke:#059669,color:#fff
    style Deploy fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Live fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## Security Architecture

```mermaid
flowchart TD
    subgraph Public["Public Data Only"]
        NoAuth[No Authentication Required]
        NoSecrets[No API Keys Needed]
        ReadOnly[Read-Only Operations]
    end
    
    subgraph Network["Network Security"]
        HTTPS[HTTPS Only]
        CORS[CORS Configured]
        CSP[Content Security Policy]
    end
    
    subgraph Input["Input Validation"]
        TypeCheck[TypeScript Validation]
        Sanitize[URL Sanitization]
        SafeJSON[Safe JSON Parsing]
    end
    
    subgraph Container["Container Security"]
        NonRoot[Non-Root User]
        Minimal[Minimal Base Image]
        NoSecrets2[No Secrets in Image]
    end
    
    Public --> Safe[Inherently Safe]
    Network --> Protected[Network Protected]
    Input --> Validated[Input Validated]
    Container --> Secure[Container Secured]
    
    Safe & Protected & Validated & Secure --> SecureApp[Secure Application]
    
    style Public fill:#10b981,stroke:#059669,color:#fff
    style Network fill:#3b82f6,stroke:#2563eb,color:#fff
    style SecureApp fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

---

## Future Enhancements

```mermaid
timeline
    title Verana Visualizer Roadmap
    
    section Phase 1 - Complete ✅
        Current Features : Dashboard
                        : Trust Registries
                        : DID Directory
                        : Network Graph
                        : Real-Time Charts
    
    section Phase 2 - Planned
        Performance : Client-Side Caching
                   : Incremental Data Loading
                   : Service Worker
                   : CDN Integration
    
    section Phase 3 - Future
        Advanced Features : WebSocket Real-Time
                         : Custom Dashboards
                         : Data Export (CSV/PNG)
                         : Alerts & Notifications
    
    section Phase 4 - Vision
        Enterprise : Multi-Chain Support
                  : Advanced Analytics
                  : Predictive Models
                  : API for Integration
```

---

## Key Design Decisions

### 1. Historical Data via Height Queries

**Decision**: Query blockchain state at different heights rather than dedicated historical API

**Rationale**:
- Cosmos SDK natively supports `?height=X` parameter
- No additional backend infrastructure needed
- Guaranteed accuracy (direct from chain state)
- Works with any Cosmos SDK chain

**Trade-offs**:
- Slower than dedicated indexer (~10-30s vs <1s)
- More API requests (~90-150 vs 1-5)
- Network dependent

**Future**: Integrate with indexer when available

### 2. Client-Side Data Fetching

**Decision**: Fetch data in browser with React hooks

**Rationale**:
- Real-time updates possible
- Better loading states and progress
- Simpler error handling
- Reduces server load

**Trade-offs**:
- Slower initial page load than SSR
- Client bears loading time
- Network dependent

### 3. Recharts for Visualization

**Decision**: Use Recharts over Chart.js or D3

**Rationale**:
- React-native (better integration)
- Composable components
- TypeScript support
- Smaller bundle for React apps
- Dark mode support

**Trade-offs**:
- Smaller ecosystem than Chart.js
- Less customization than D3
- Good enough for our needs

### 4. 30-Day Default Time Range

**Decision**: Default to 30 days of historical data

**Rationale**:
- Balances detail vs performance
- Meaningful trends visible
- 30 points = reasonable load time
- Standard analytics period

**Trade-offs**:
- Not suitable for long-term analysis
- May miss seasonal patterns
- Configurable for future needs

---

## Component Dependencies

```mermaid
flowchart TD
    subgraph Core["Core Dependencies"]
        Next[next: 15.5.3]
        React[react: 18.x]
        TS[typescript: 5.x]
    end
    
    subgraph Visualization["Visualization"]
        Recharts[recharts: 2.15.4]
        ForceGraph[3d-force-graph: 1.79.0]
        Three[three: 0.180.0]
    end
    
    subgraph Styling["Styling"]
        Tailwind[tailwindcss: 3.4.1]
        PostCSS[postcss: 8.x]
        AutoPrefixer[autoprefixer: 10.x]
    end
    
    subgraph Testing["Testing"]
        Vitest[vitest: 2.1.8]
        TestLib[@testing-library/react: 16.x]
        Coverage[@vitest/coverage-v8: 2.1.8]
    end
    
    Core --> App[Application]
    Visualization --> App
    Styling --> App
    Testing --> App
    
    App --> Production[Production Build]
```

---

## Conclusion

The Verana Visualizer architecture is designed for:

✅ **Performance**: Optimized data fetching and rendering  
✅ **Scalability**: Handles growing network data  
✅ **Reliability**: Error handling and graceful degradation  
✅ **Maintainability**: Clear separation of concerns  
✅ **Extensibility**: Easy to add new features  
✅ **Production-Ready**: Full containerization and deployment support  

The system fetches real historical blockchain data to provide accurate, verifiable insights into the Verana network's operation and growth.

---

*Architecture documentation maintained as of November 2024*
