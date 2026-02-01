// analytics.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// =====================================================
// SUPABASE CONFIG
// =====================================================
const SUPABASE_URL = 'https://wnrqfrwsnjjqpgkcship.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_X966BS58oHpJXAZp4a6EPw_M2qIFXY4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// =====================================================
// SESSION & VISITOR HELPERS
// =====================================================
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

// =====================================================
// PAGE VIEW TRACKING
// =====================================================
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

// =====================================================
// CLICK TRACKING
// =====================================================
document.addEventListener('click', async (e) => {
    const target = e.target.closest('a, button')
    if (!target) return

    const label =
        target.innerText?.trim() ||
        target.getAttribute('aria-label') ||
        target.getAttribute('href') ||
        'unknown'

    const { error } = await supabase
        .from('events')
        .insert([{
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
            event_type: 'click',
            page: window.location.pathname,
            element: label
        }])

    if (error) console.error('Click error:', error)
})

// =====================================================
// FETCH EVENTS
// =====================================================
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

// =====================================================
// PROCESS METRICS
// =====================================================
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

// =====================================================
// INIT ANALYTICS (DOM SAFE)
// =====================================================
async function initAnalytics() {
    const events = await fetchEvents()
    if (!events.length) return

    const metrics = processMetrics(events)

    // -------- Site Analytics KPIs --------
    const kpiEvents = document.getElementById('kpi-events')
    const kpiVisitors = document.getElementById('kpi-visitors')
    const kpiSessions = document.getElementById('kpi-sessions')
    const kpiTopPage = document.getElementById('kpi-top-page')

    if (kpiEvents) kpiEvents.innerText = metrics.totalEvents
    if (kpiVisitors) kpiVisitors.innerText = metrics.uniqueVisitors
    if (kpiSessions) kpiSessions.innerText = metrics.sessions
    if (kpiTopPage) {
        kpiTopPage.innerText =
            metrics.topPage.replace('/', '') || 'home'
    }

    // -------- Homepage Mini KPIs --------
    const miniEvents = document.getElementById('mini-events')
    const miniVisitors = document.getElementById('mini-visitors')
    const miniTime = document.getElementById('mini-time')

    if (miniEvents) miniEvents.innerText = metrics.totalEvents
    if (miniVisitors) miniVisitors.innerText = metrics.uniqueVisitors
    if (miniTime) miniTime.innerText = '—'
}

// IMPORTANT: wait for DOM on GitHub Pages
document.addEventListener('DOMContentLoaded', initAnalytics)
