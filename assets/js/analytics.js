import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// =====================================================
// SUPABASE CONFIG
// =====================================================
const SUPABASE_URL = 'https://wnrqfrwsnjjqpgkcship.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_X966BS58oHpJXAZp4a6EPw_M2qIFXY4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// =====================================================
// VISITOR & SESSION HELPERS
// =====================================================
function getVisitorId() {
    let id = localStorage.getItem('visitor_id')
    if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem('visitor_id', id)
    }
    return id
}

function getSessionId() {
    let id = sessionStorage.getItem('session_id')
    if (!id) {
        id = crypto.randomUUID()
        sessionStorage.setItem('session_id', id)
    }
    return id
}

// =====================================================
// PAGE VIEW TRACKING
// =====================================================
async function trackPageView() {
    sessionStorage.setItem('page_enter_time', Date.now())

    const { error } = await supabase.from('events').insert([{
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        event_type: 'page_view',
        page: window.location.pathname
    }])

    if (error) {
        console.error('Page view error:', error.message)
    }
}

window.addEventListener('load', trackPageView)

// =====================================================
// CLICK TRACKING
// =====================================================
document.addEventListener('click', async (e) => {
    const target = e.target.closest('a, button')
    if (!target) return

    const element =
        target.innerText?.trim() ||
        target.getAttribute('aria-label') ||
        target.getAttribute('href') ||
        'unknown'

    const { error } = await supabase.from('events').insert([{
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        event_type: 'click',
        page: window.location.pathname,
        element
    }])

    if (error) {
        console.error('Click error:', error.message)
    }
})

// =====================================================
// TIME ON PAGE (SESSION END)
// =====================================================
window.addEventListener('beforeunload', async () => {
    const enterTime = sessionStorage.getItem('page_enter_time')
    if (!enterTime) return

    const seconds = Math.round((Date.now() - enterTime) / 1000)

    const { error } = await supabase.from('events').insert([{
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        event_type: 'time_on_page',
        page: window.location.pathname,
        element: `${seconds}s`
    }])

    if (error) {
        console.error('Time error:', error.message)
    }
})
