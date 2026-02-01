// analytics.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ============================
// SUPABASE CONFIG
// ============================
const SUPABASE_URL = 'https://wnrqfrwsnjjqpgkcship.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================
// SESSION + VISITOR
// ============================
function getSessionId() {
    let id = sessionStorage.getItem('session_id')
    if (!id) {
        id = crypto.randomUUID()
        sessionStorage.setItem('session_id', id)
    }
    return id
}

function getVisitorId() {
    let id = localStorage.getItem('visitor_id')
    if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem('visitor_id', id)
    }
    return id
}

// ============================
// PAGE VIEW
// ============================
async function trackPageView() {
    const { error } = await supabase
        .from('events')
        .insert([{
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
            event_type: 'page_view',
            page: window.location.pathname
        }])

    if (error) console.error('Page view error:', error)
}

window.addEventListener('load', trackPageView)

// ============================
// CLICK TRACKING
// ============================
document.addEventListener('click', async (e) => {
    const target = e.target.closest('a, button')
    if (!target) return

    const label =
        target.innerText?.trim() ||
        target.getAttribute('href') ||
        'unknown'

    await supabase
        .from('events')
        .insert([{
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
            event_type: 'click',
            page: window.location.pathname,
            element: label
        }])
})

// ============================
// FETCH EVENTS
// ============================
async function fetchEvents() {
    const { data, error } = await supabase
        .from('events')
        .select('*')

    if (error) {
        console.error('Fetch error:', error)
        return []
    }
    return data
}

// ============================
// PROCESS METRICS
// ============================
function processMetrics(events) {
    const visitors = new Set()
    const sessions = new Set()
    const pageCounts = {}

    events.forEach(e => {
        if (e.visitor_id) visitors.add(e.visitor_id)
        if (e.session_id) sessions.add(e.session_id)

        if (e.event_type === 'page_view') {
            pageCounts[e.page] = (pageCounts[e.page] || 0) + 1
        }
    })

    const topPage =
        Object.entries(pageCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    return {
        totalEvents: events.length,
        uniqueVisitors: visitors.size,
        sessions: sessions.size,
        topPage
    }
}

// ============================
// INIT (ALL PAGES)
// ============================
async function initAnalytics() {
    const events = await fetchEvents()
    if (!events.length) return

    const metrics = processMetrics(events)

    // ----- Site Analytics page KPIs -----
    if (document.getElementById('kpi-events')) {
        document.getElementById('kpi-events').innerText = metrics.totalEvents
        document.getElementById('kpi-visitors').innerText = metrics.uniqueVisitors
        document.getElementById('kpi-sessions').innerText = metrics.sessions
        document.getElementById('kpi-top-page').innerText =
            metrics.topPage.replace('/', '') || 'home'
    }

    // ----- Homepage mini KPIs -----
    if (document.getElementById('mini-events')) {
        document.getElementById('mini-events').innerText = metrics.totalEvents
        document.getElementById('mini-visitors').innerText = metrics.uniqueVisitors
        document.getElementById('mini-time').innerText = '—'
    }
}

initAnalytics()
