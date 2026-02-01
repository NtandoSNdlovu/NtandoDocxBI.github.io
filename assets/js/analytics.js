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

function getDailyVisitorKey() {
    const day = new Date().toISOString().split('T')[0]
    return `${navigator.userAgent}_${day}`
}

function now() {
    return new Date().toISOString()
}

// =====================================================
// PAGE VIEW TRACKING
// =====================================================
async function trackPageView() {
    const page = window.location.pathname
    const referrer = document.referrer || null

    sessionStorage.setItem('page_enter_time', Date.now())

    const { error } = await supabase.from('events').insert([{
        event_type: 'page_view',
        page,
        referrer,
        session_id: getSessionId(),
        visitor_key: getDailyVisitorKey(),
        user_agent: navigator.userAgent,
        created_at: now()
    }])

    if (error) console.error('Page view error:', error)
}

window.addEventListener('load', trackPageView)

// =====================================================
// TIME ON PAGE (fires on leave)
// =====================================================
window.addEventListener('beforeunload', async () => {
    const enterTime = sessionStorage.getItem('page_enter_time')
    if (!enterTime) return

    const durationSeconds = Math.round((Date.now() - enterTime) / 1000)

    await supabase.from('events').insert([{
        event_type: 'time_on_page',
        page: window.location.pathname,
        session_id: getSessionId(),
        value: durationSeconds,
        created_at: now()
    }])
})

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

    await supabase.from('events').insert([{
        event_type: 'click',
        page: window.location.pathname,
        label,
        session_id: getSessionId(),
        created_at: now()
    }])
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
    const uniqueVisitors = new Set()
    const sessions = new Set()
    const pageViews = {}
    let totalTime = 0
    let timeEvents = 0

    events.forEach(e => {
        if (e.visitor_key) uniqueVisitors.add(e.visitor_key)
        if (e.session_id) sessions.add(e.session_id)

        if (e.event_type === 'page_view') {
            pageViews[e.page] = (pageViews[e.page] || 0) + 1
        }

        if (e.event_type === 'time_on_page') {
            totalTime += Number(e.value || 0)
            timeEvents++
        }
    })

    const topPage =
        Object.entries(pageViews).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    return {
        totalEvents: events.length,
        uniqueVisitors: uniqueVisitors.size,
        sessions: sessions.size,
        avgTimeOnPage: timeEvents ? Math.round(totalTime / timeEvents) : 0,
        topPage
    }
}

// =====================================================
// INIT ANALYTICS (DASHBOARD + MINI KPIs)
// =====================================================
async function initAnalytics() {
    const events = await fetchEvents()
    if (!events.length) return

    const metrics = processMetrics(events)

    // ---------- MAIN KPI TILES ----------
    const stats = document.querySelectorAll('.stat-value')
    if (stats.length >= 4) {
        stats[0].innerText = metrics.totalEvents
        stats[1].innerText = metrics.uniqueVisitors
        stats[2].innerText = metrics.sessions
        stats[3].innerText = `${metrics.avgTimeOnPage}s`
    }

    // ---------- MINI KPI PREVIEW (INDEX) ----------
    const miniEvents = document.getElementById('mini-events')
    const miniVisitors = document.getElementById('mini-visitors')
    const miniTime = document.getElementById('mini-time')

    if (miniEvents) miniEvents.innerText = metrics.totalEvents
    if (miniVisitors) miniVisitors.innerText = metrics.uniqueVisitors
    if (miniTime) miniTime.innerText = `${metrics.avgTimeOnPage}s`
}

initAnalytics()
