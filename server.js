require('dotenv').config();

const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Check configuration
if (!process.env.SUPABASE_URL ||
    !process.env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing Supabase environment variables');
}

// Authentication middleware
async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        const token = authHeader.split(' ')[1];

        // Create a Supabase client using this user's access token
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_PUBLISHABLE_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                },
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        // Verify token with Supabase Auth
        const { data, error } =
            await userSupabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                error: 'Invalid or expired login session'
            });
        }

        req.user = data.user;
        req.supabase = userSupabase;

        next();

    } catch (error) {
        console.error('Authentication error:', error);

        return res.status(401).json({
            error: 'Authentication failed'
        });
    }
}

// GET: Display only the logged-in user's tasks
app.get('/api/tasks', authenticateUser, async (req, res) => {
    const { data, error } = await req.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', req.user.id)
        .order('id', { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// POST: Add a task for the logged-in user
app.post('/api/tasks', authenticateUser, async (req, res) => {
    const { title } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            error: 'Task title is required'
        });
    }

    const { data, error } = await req.supabase
        .from('tasks')
        .insert([{
            title: title.trim(),
            user_id: req.user.id
        }])
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
});

// PATCH: Toggle completion of an owned task
app.patch('/api/tasks/:id', authenticateUser, async (req, res) => {
    const { data: existing, error: findError } = await req.supabase
        .from('tasks')
        .select('completed')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .maybeSingle();

    if (findError) {
        return res.status(500).json({ error: findError.message });
    }

    if (!existing) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const { data, error } = await req.supabase
        .from('tasks')
        .update({ completed: !existing.completed })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// DELETE: Delete only an owned task
app.delete('/api/tasks/:id', authenticateUser, async (req, res) => {
    const { data, error } = await req.supabase
        .from('tasks')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuickTask running at http://localhost:${PORT}`);
});