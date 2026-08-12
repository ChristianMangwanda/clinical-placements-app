"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CircleHelp,
  Code2,
  Database,
  Download,
  ExternalLink,
  GraduationCap,
  Hospital,
  Map,
  MapPin,
  Navigation,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Table2,
  Users,
  Workflow,
} from "lucide-react";
import styles from "./help.module.css";

const contents = [
  ["overview", "Purpose and audience"],
  ["use", "How to use the site"],
  ["data", "Data sources"],
  ["quality", "Data decisions"],
  ["technology", "Technology stack"],
  ["architecture", "Architecture"],
  ["decisions", "Technical decisions"],
  ["risks", "Limits and risks"],
  ["maintenance", "Maintenance"],
] as const;

const mapLayers = [
  {
    category: "Clarkson data",
    title: "Active Clarkson Sites",
    description: "Current placement partners from the Exxat export.",
    icon: Star,
  },
  {
    category: "National healthcare",
    title: "HRSA Sites",
    description: "Healthcare facilities that can represent new placement opportunities.",
    icon: Hospital,
  },
  {
    category: "Professional education",
    title: "PT/OT/PA Schools",
    description: "Accredited programs and possible regional competitors.",
    icon: GraduationCap,
  },
  {
    category: "Higher education",
    title: "Post-Secondary Schools",
    description: "Colleges and universities across the United States.",
    icon: Building2,
  },
  {
    category: "Federal geography",
    title: "Military Sites",
    description: "Military bases and installations from national source data.",
    icon: MapPin,
  },
  {
    category: "Census geography",
    title: "Native American Reserves",
    description: "Tribal reservation locations from Census geographic data.",
    icon: Map,
  },
];

const stack = [
  ["Application", "Next.js 16", "Pages and API routes in one App Router project."],
  ["Interface", "React 19 + TypeScript", "Typed components and shared data interfaces."],
  ["Map", "Leaflet", "Markers, popups, layers, choropleths, and radius overlays."],
  ["Database", "Supabase PostgreSQL", "Managed storage for map, demographic, and economic data."],
  ["Database client", "node-postgres", "Direct server access through the pg package."],
  ["Artificial intelligence", "Anthropic Claude", "Plain-English questions, SQL generation, and summaries."],
  ["Hosting", "Vercel", "Production builds and automatic deployment from main."],
  ["Data pipeline", "Python", "Collection, cleaning, geocoding, and batch imports."],
  ["Testing", "Jest", "Selected component, distance, and SQL-validation tests."],
] as const;

const decisions = [
  ["One Next.js application", "The interface and API share one repository and one Vercel deployment."],
  ["Direct PostgreSQL access", "The pg client supports complex SQL and the AI query workflow."],
  ["Managed PostgreSQL", "Supabase replaced a campus MySQL server that Vercel could not reach."],
  ["Viewport loading", "The site requests visible records instead of all 74,772 HRSA markers."],
  ["Data-driven layers", "The layers table controls names, colors, icons, order, and visibility."],
  ["Coverage in the database", "The county_coverage view gives the map and AI one method."],
  ["Client-side radius", "Haversine distance gives immediate results without a routing service."],
  ["Auditable AI queries", "Each answer includes generated SQL and uses a 500-row limit."],
  ["Filter-focused indexes", "Indexes support state, coordinates, category, FIPS, and profession filters."],
  ["Batch imports", "Python fits datasets that change by semester, release, or annual cycle."],
] as const;

const risks = [
  "The public deployment has no user authentication.",
  "The AI endpoint can create paid Anthropic API usage.",
  "A Supabase password existed in public Git history and requires rotation.",
  "The application has no staging environment.",
  "A wide map view can omit records after the 5,000-row limit.",
  "The map has no marker clustering.",
  "The radius labels describe time, but the tool calculates straight-line distance.",
  "The database has no program outcomes, tuition, or contact data.",
  "The current test suite does not exercise API routes.",
];

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <li className={styles.step}>
      <span className={styles.stepNumber}>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  );
}

function Checklist({ children }: { children: React.ReactNode }) {
  return (
    <li className={styles.checkItem}>
      <span><Check size={12} strokeWidth={3} /></span>
      <p>{children}</p>
    </li>
  );
}

export default function HelpGuide() {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard" aria-label="Return to the Clinical Placements dashboard">
          <Image
            src="/Clarkson-logo-full.png"
            alt="Clarkson University"
            width={210}
            height={48}
            priority
          />
          <span aria-hidden="true" />
          <b>Clinical Placements<br />Project Guide</b>
        </Link>
        <nav aria-label="Help navigation">
          <Link href="/dashboard"><ArrowLeft size={15} /> Back to dashboard</Link>
          <Link className={styles.topbarCta} href="https://clinical-placements-app.vercel.app/dashboard">
            Open live site <ExternalLink size={14} />
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGrid} aria-hidden="true" />
          <span className={`${styles.pin} ${styles.pinOne}`} aria-hidden="true" />
          <span className={`${styles.pin} ${styles.pinTwo}`} aria-hidden="true" />
          <span className={`${styles.pin} ${styles.pinThree}`} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><CircleHelp size={14} /> Project documentation · August 2026</p>
              <h1>Clinical Placements <span>Project Guide</span></h1>
              <p className={styles.heroSummary}>
                Learn how to use the site, where the data came from, how the system works,
                and why the project uses its current technical design.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#use">Start the guide <ArrowRight size={17} /></a>
                <button className={styles.secondaryButton} type="button" onClick={() => window.print()}>
                  <Printer size={16} /> Print guide
                </button>
              </div>
            </div>
            <div className={styles.heroPanel}>
              <div className={styles.heroPanelTop}>
                <span><BookOpen size={18} /> Inside this guide</span>
                <b>10 sections</b>
              </div>
              <div className={styles.heroPanelMap}>
                <div><MapPin size={24} /><span>Use the map</span></div>
                <div><Database size={24} /><span>Trace the data</span></div>
                <div><Code2 size={24} /><span>Understand the stack</span></div>
                <div><Workflow size={24} /><span>Maintain the project</span></div>
              </div>
              <div className={styles.heroPanelBottom}><span className={styles.liveDot} /> Guide linked from the dashboard</div>
            </div>
          </div>
        </section>

        <section className={styles.stats} aria-label="Project summary">
          <div><strong>74,772</strong><span>HRSA facilities</span></div>
          <div><strong>805</strong><span>Active sites</span></div>
          <div><strong>858</strong><span>PT · OT · PA programs</span></div>
          <div><strong>10 + 1</strong><span>Tables and view</span></div>
        </section>

        <div className={styles.guideShell}>
          <aside className={styles.contents}>
            <p>In this guide</p>
            <ol>
              {contents.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
            </ol>
          </aside>

          <article className={styles.article}>
            <section className={styles.section} id="overview">
              <p className={styles.kicker}>01 · Overview</p>
              <h2>One map for clinical placement research</h2>
              <span className={styles.goldRule} />
              <p className={styles.intro}>
                The site combines Clarkson placement sites with national healthcare,
                education, demographic, and economic data.
              </p>
              <div className={styles.threeGrid}>
                <div className={styles.card}><Users /><small>Find</small><h3>Current partners</h3><p>See Clarkson sites that support PT, OT, and PA placements.</p></div>
                <div className={styles.card}><Search /><small>Explore</small><h3>New opportunities</h3><p>Compare facilities, schools, military sites, and regional coverage.</p></div>
                <div className={styles.card}><Table2 /><small>Analyze</small><h3>Regional patterns</h3><p>Use filters, choropleths, exports, and database questions.</p></div>
              </div>
              <div className={`${styles.callout} ${styles.warning}`}>
                <AlertTriangle size={20} />
                <div><strong>Privacy notice</strong><p>The deployment has no login. Do not enter confidential information in the AI assistant.</p></div>
              </div>
            </section>

            <section className={styles.section} id="use">
              <p className={styles.kicker}>02 · User guide</p>
              <h2>How to use the site</h2>
              <span className={styles.goldRule} />
              <p className={styles.intro}>The dashboard includes map layers, filters, search, a results table, radius analysis, and an AI assistant.</p>

              <h3>Open the database</h3>
              <ol className={styles.steps}>
                <Step number="01" title="Open the site">Go to the Clinical Placements Database landing page.</Step>
                <Step number="02" title="Enter the database">Select <b>Enter Database</b>.</Step>
                <Step number="03" title="Wait for the map">Let the layer controls and map markers finish loading.</Step>
              </ol>

              <h3>Choose map layers</h3>
              <div className={styles.twoGrid}>
                {mapLayers.map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <div className={styles.layerCard} key={layer.title}>
                      <Icon />
                      <div><small>{layer.category}</small><h4>{layer.title}</h4><p>{layer.description}</p></div>
                    </div>
                  );
                })}
              </div>

              <h3>Use analysis layers</h3>
              <div className={styles.tableWrap}>
                <table>
                  <thead><tr><th>Layer</th><th>Level</th><th>What it shows</th></tr></thead>
                  <tbody>
                    <tr><td>Population Change</td><td>County</td><td>Green counties grow. Red counties decline.</td></tr>
                    <tr><td>Healthcare Coverage</td><td>County</td><td>Population compared with qualifying facilities.</td></tr>
                    <tr><td>GDP Growth</td><td>State</td><td>State economic growth from BEA data.</td></tr>
                    <tr><td>Healthcare Employment</td><td>State</td><td>The healthcare share of state employment.</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>Filter, search, and export</h3>
              <ul className={styles.checklist}>
                <Checklist>Use <b>States</b> to limit results to one or more states.</Checklist>
                <Checklist>Use <b>Clinic Type</b> to filter HRSA facilities.</Checklist>
                <Checklist>Use <b>PT</b>, <b>OT</b>, and <b>PA</b> to filter professional schools.</Checklist>
                <Checklist>Select a marker to read the location and layer-specific details.</Checklist>
                <Checklist>Use <b>Export</b> for CSV data and <b>Print</b> for a branded list.</Checklist>
              </ul>

              <h3>Ask the AI assistant</h3>
              <ol className={styles.steps}>
                <Step number="01" title="Open the assistant">Select <b>Ask AI Assistant</b>.</Step>
                <Step number="02" title="Ask a focused question">Name a geography, program, facility type, or measurement.</Step>
                <Step number="03" title="Read the evidence">Review the summary, records, map points, and generated SQL.</Step>
              </ol>
              <div className={styles.examples}>
                <p><Sparkles size={16} /> Example questions</p>
                <ul>
                  <li>Show active OT sites in New York.</li>
                  <li>Find California hospitals with more than 100 beds.</li>
                  <li>Which states have no OT programs?</li>
                  <li>Which Kansas counties have the lowest healthcare coverage?</li>
                </ul>
              </div>
              <div className={styles.callout}>
                <ShieldCheck size={20} />
                <div><strong>AI query controls</strong><p>The server rejects write queries and limits results to 500 rows. Review the table and displayed SQL.</p></div>
              </div>

              <h3>Use radius analysis</h3>
              <ol className={styles.steps}>
                <Step number="01" title="Start the tool">Select the compass button in the upper-right map area.</Step>
                <Step number="02" title="Choose a location">Select a point on the map.</Step>
                <Step number="03" title="Read the rings">Review sites inside the 20, 45, and 70 mile rings.</Step>
              </ol>
              <div className={`${styles.callout} ${styles.warning}`}>
                <Navigation size={20} />
                <div><strong>Distance limitation</strong><p>The interface uses time labels, but the tool calculates straight-line distance.</p></div>
              </div>
            </section>

            <section className={styles.section} id="data">
              <p className={styles.kicker}>03 · Provenance</p>
              <h2>Where the data came from</h2>
              <span className={styles.goldRule} />
              <p className={styles.intro}>The app joins Clarkson operational data with public datasets and professional accreditation directories.</p>
              <div className={styles.tableWrap}>
                <table>
                  <thead><tr><th>Dataset</th><th>Original source</th><th>Preparation</th><th>Database object</th><th>Refresh</th></tr></thead>
                  <tbody>
                    <tr><td>Active Clarkson sites</td><td>Clarkson Exxat export</td><td><code>Active_Exxat_Sites__1_.xlsx</code></td><td><code>active_sites</code></td><td>Each semester</td></tr>
                    <tr><td>Healthcare facilities</td><td>HRSA</td><td><code>hrsa_v3.xlsx</code></td><td><code>hrsa_sites</code></td><td>New export</td></tr>
                    <tr><td>PT programs</td><td>CAPTE</td><td><code>ingestors/capte.py</code></td><td><code>schools</code></td><td>Directory change</td></tr>
                    <tr><td>OT programs</td><td>ACOTE</td><td><code>ingestors/acote.py</code></td><td><code>schools</code></td><td>Directory change</td></tr>
                    <tr><td>PA programs</td><td>ARC-PA</td><td><code>ingestors/arcpa.py</code></td><td><code>schools</code></td><td>Directory change</td></tr>
                    <tr><td>Post-secondary schools</td><td>U.S. Department of Education</td><td><code>Postsecondary_School_Locations.xlsx</code></td><td><code>post_secondary_schools</code></td><td>New source</td></tr>
                    <tr><td>Military installations</td><td>U.S. DoD and NTAD</td><td><code>NTAD_Military_Bases_*.xlsx</code></td><td><code>military_sites</code></td><td>New source</td></tr>
                    <tr><td>Tribal reservations</td><td>U.S. Census Bureau</td><td><code>tl_2020_us_aiannh/</code></td><td><code>native_american_reserves</code></td><td>New release</td></tr>
                    <tr><td>County population</td><td>U.S. Census PEP</td><td><code>import_county_population.py</code></td><td><code>county_population</code></td><td>New estimates</td></tr>
                    <tr><td>State GDP</td><td>U.S. BEA</td><td><code>import_state_economic.py</code></td><td><code>state_economic</code></td><td>Annually</td></tr>
                    <tr><td>Healthcare employment</td><td>U.S. BLS QCEW</td><td><code>import_state_economic.py</code></td><td><code>state_economic</code></td><td>Annually</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>Verified record counts</h3>
              <div className={styles.countGrid}>
                {[ ["74,772", "HRSA sites"], ["805", "Active sites"], ["858", "Program rows"], ["6,812", "Post-secondary"], ["824", "Military sites"], ["693", "Reservations"], ["3,144", "Counties"], ["51", "State records"] ].map(([count, label]) => (
                  <div key={label}><strong>{count}</strong><span>{label}</span></div>
                ))}
              </div>
              <div className={`${styles.callout} ${styles.warning}`}>
                <AlertTriangle size={20} />
                <div><strong>Count discrepancy</strong><p>The dashboard displays 90,664 locations. This total needs review against the documented layer counts.</p></div>
              </div>

              <h3>Active-site data pipeline</h3>
              <ol className={styles.steps}>
                <Step number="01" title="Export">Export active placement sites from Exxat.</Step>
                <Step number="02" title="Clean">Standardize names, addresses, and programs.</Step>
                <Step number="03" title="Geocode">Use the Google Maps Geocoding API and local request cache.</Step>
                <Step number="04" title="Load">Import rows with valid coordinates into PostgreSQL.</Step>
              </ol>
            </section>

            <section className={styles.section} id="quality">
              <p className={styles.kicker}>04 · Data quality</p>
              <h2>Rules that keep the data consistent</h2>
              <span className={styles.goldRule} />
              <ul className={styles.checklist}>
                <Checklist>County FIPS codes use five-character text to preserve leading zeros.</Checklist>
                <Checklist>Rows with invalid coordinates do not enter map tables.</Checklist>
                <Checklist>Active sites use program booleans for fast PT, OT, and PA filters.</Checklist>
                <Checklist>Professional schools use one row for each accredited program.</Checklist>
                <Checklist>The coverage view excludes home health agencies and hospices.</Checklist>
                <Checklist>Counties with no qualifying facility receive a null ratio, not zero.</Checklist>
              </ul>
              <div className={styles.callout}>
                <GraduationCap size={20} />
                <div><strong>School counts</strong><p>The 858 program rows represent 649 institutions and 655 campus locations.</p></div>
              </div>
            </section>

            <section className={styles.section} id="technology">
              <p className={styles.kicker}>05 · Technology</p>
              <h2>The project stack</h2>
              <span className={styles.goldRule} />
              <div className={styles.stackGrid}>
                {stack.map(([category, name, description]) => (
                  <div className={styles.stackCard} key={name}><small>{category}</small><h3>{name}</h3><p>{description}</p></div>
                ))}
              </div>
            </section>

            <section className={styles.section} id="architecture">
              <p className={styles.kicker}>06 · Architecture</p>
              <h2>How a request moves through the system</h2>
              <span className={styles.goldRule} />
              <div className={styles.flow} aria-label="Application architecture">
                <div><Users /><strong>Site user</strong><span>Map, filters, search, table, and AI</span></div>
                <ArrowRight aria-hidden="true" />
                <div><Code2 /><strong>Next.js on Vercel</strong><span>Pages and server API routes</span></div>
                <ArrowRight aria-hidden="true" />
                <div><Database /><strong>Supabase PostgreSQL</strong><span>Tables, analytical view, and indexes</span></div>
              </div>
              <div className={styles.flowNotes}>
                <div><Sparkles /><p><strong>AI path</strong> Claude generates SQL. The server applies read-only rules before execution.</p></div>
                <div><Download /><p><strong>Data path</strong> Python reads source files and APIs, cleans records, and inserts batches.</p></div>
              </div>
            </section>

            <section className={styles.section} id="decisions">
              <p className={styles.kicker}>07 · Design rationale</p>
              <h2>Main technical decisions</h2>
              <span className={styles.goldRule} />
              <div className={styles.decisionGrid}>
                {decisions.map(([title, description], index) => (
                  <div className={styles.decisionCard} key={title}><small>{String(index + 1).padStart(2, "0")}</small><h3>{title}</h3><p>{description}</p></div>
                ))}
              </div>
            </section>

            <section className={styles.section} id="risks">
              <p className={styles.kicker}>08 · Current state</p>
              <h2>Known limitations and risks</h2>
              <span className={styles.goldRule} />
              <ul className={styles.risks}>{risks.map((risk) => <li key={risk}><AlertTriangle size={16} />{risk}</li>)}</ul>
            </section>

            <section className={styles.section} id="maintenance">
              <p className={styles.kicker}>09 · Operations</p>
              <h2>Maintenance guide</h2>
              <span className={styles.goldRule} />
              <h3>Before a deployment</h3>
              <ol className={styles.steps}>
                <Step number="01" title="Build">Run <code>npm run build</code>.</Step>
                <Step number="02" title="Run the tests">Run <code>npx jest --ci</code>.</Step>
                <Step number="03" title="Run the type check">Run <code>npx tsc --noEmit</code>.</Step>
                <Step number="04" title="Review database queries">Compare changed queries with <code>supabase_schema.sql</code>.</Step>
              </ol>
              <div className={`${styles.callout} ${styles.warning}`}>
                <AlertTriangle size={20} /><div><strong>Production deployment</strong><p>A push to main deploys production. The project has no staging environment.</p></div>
              </div>
              <h3>After a schema change</h3>
              <ul className={styles.checklist}>
                <Checklist>Update <code>supabase_schema.sql</code> in the same commit.</Checklist>
                <Checklist>Update <code>src/lib/agent-system-prompt.ts</code>.</Checklist>
                <Checklist>Review each affected route in <code>src/app/api/</code>.</Checklist>
                <Checklist>Complete the build, tests, and type check.</Checklist>
              </ul>
              <h3>After a data refresh</h3>
              <ul className={styles.checklist}>
                <Checklist>Compare imported row counts with source counts.</Checklist>
                <Checklist>Preserve leading zeros in state and FIPS codes.</Checklist>
                <Checklist>Make sure that latitude and longitude values are valid.</Checklist>
                <Checklist>Open the map and select the refreshed layer.</Checklist>
                <Checklist>Run sample AI questions with the refreshed data.</Checklist>
              </ul>
            </section>

            <section className={styles.section}>
              <p className={styles.kicker}>10 · References</p>
              <h2>Continue in the project documentation</h2>
              <span className={styles.goldRule} />
              <div className={styles.references}>
                <a href="https://github.com/ChristianMangwanda/clinical-placements-app"><span><Database /> GitHub repository</span><ExternalLink /></a>
                <a href="https://github.com/ChristianMangwanda/clinical-placements-app/blob/main/docs/DATABASE.md"><span><Table2 /> Database guide</span><ExternalLink /></a>
                <a href="https://github.com/ChristianMangwanda/clinical-placements-app/blob/main/docs/DATA_PIPELINE.md"><span><Workflow /> Data pipeline</span><ExternalLink /></a>
                <a href="https://github.com/ChristianMangwanda/clinical-placements-app/blob/main/docs/OPERATIONS.md"><span><ShieldCheck /> Operations guide</span><ExternalLink /></a>
              </div>
            </section>
          </article>
        </div>

        <section className={styles.closing}>
          <div><h2>Ready to explore the database?</h2><p>Return to the map and use the guide as your reference.</p></div>
          <Link href="/dashboard">Enter Database <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <Image src="/Clarkson-logo-full.png" alt="Clarkson University" width={220} height={50} />
        <p>Clinical Placements Database Project Guide<br />Updated August 12, 2026</p>
      </footer>
    </div>
  );
}
