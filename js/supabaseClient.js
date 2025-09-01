const supabaseUrl = "https://nzumwlptqrwbpenoxrkf.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dW13bHB0cXJ3YnBlbm94cmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MjE3OTAsImV4cCI6MjA2MDI5Nzc5MH0.TrYL14oyXfZKG708kyNI2TqzF2hDLkR_MpAIw-LiJ_M"

// Bruk window.supabase.createClient hvis du laster fra CDN
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)
