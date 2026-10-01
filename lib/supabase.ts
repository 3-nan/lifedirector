// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://yawjnqaxwdwteruhebjm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhd2pucWF4d2R3dGVydWhlYmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyOTM3NDIsImV4cCI6MjEwMzg2OTc0Mn0.Qfho4rFUdmnFq1yxUxJGfxmHCtI2ZokkzI9luc05bsw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});