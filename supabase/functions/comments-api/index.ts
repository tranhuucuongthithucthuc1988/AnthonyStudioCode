// ══════════════════════════════════════════════════════════════
// ANTHONY STUDIO - COMMENTS API (Edge Function)
// Chạy trên server Supabase, KHÔNG BAO GIỜ lộ key ra browser.
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Biến môi trường tự động có sẵn khi deploy lên Supabase
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Client admin — có toàn quyền, CHỈ chạy trên server
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS: cho phép mọi domain gọi (vì web bạn có thể truy cập từ nhiều nơi)
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ══════════════════════════════════════════════════════════════
// DANH SÁCH TỪ CẤM (kiểm duyệt ở server — không thể bypass)
// ══════════════════════════════════════════════════════════════
const BANNED_WORDS = [
    "địt", "đụ", "đéo", "đĩ", "điếm", "cặc", "lồn", "buồi", "dái",
    "chó đẻ", "mẹ mày", "bố mày", "thằng chó", "con chó", "óc chó",
    "ngu như", "đần độn", "khốn nạn", "súc vật", "súc sinh",
    "cứt", "ỉa", "đái", "vãi", "vl", "vcl", "vkl", "clm", "cmn",
    "dkm", "dcm", "đm", "đmm", "cmm",
    "fuck", "fucking", "shit", "bitch", "asshole", "dick", "pussy",
    "cunt", "whore", "slut", "bastard",
    "sex", "porn", "xxx", "18+", "khiêu dâm", "dâm", "dục", "loạn luân",
    "hiếp dâm", "cưỡng hiếp", "thủ dâm", "khỏa thân", "nude", "naked",
    "hentai", "jav", "sexy", "gợi tình",
    "kiếm tiền online", "casino", "cá độ", "lô đề", "cờ bạc", "đánh bạc",
    "vay tiền", "tín dụng đen",
];

const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
const PHONE_REGEX = /(\+84|0)\d{9,10}/g;

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function moderateContent(text: string): { ok: boolean; reason?: string } {
    const normalized = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ");

    for (const word of BANNED_WORDS) {
        const cleanWord = word
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/g, " ");
        const regex = new RegExp(`(^|\\s)${escapeRegex(cleanWord)}($|\\s)`, "i");
        if (regex.test(normalized)) {
            return { ok: false, reason: `Chứa từ ngữ không phù hợp: "${word}"` };
        }
    }

    if (URL_REGEX.test(text)) {
        URL_REGEX.lastIndex = 0;
        return { ok: false, reason: "Không được phép chèn link." };
    }
    URL_REGEX.lastIndex = 0;

    if (PHONE_REGEX.test(text)) {
        PHONE_REGEX.lastIndex = 0;
        return { ok: false, reason: "Không được phép chia sẻ số điện thoại." };
    }
    PHONE_REGEX.lastIndex = 0;

    if (/(.)\1{9,}/.test(text)) {
        return { ok: false, reason: "Nội dung có dấu hiệu spam." };
    }

    const letters = text.replace(/[^a-zA-ZÀ-ỹ]/g, "");
    if (letters.length > 20) {
        const upper = (text.match(/[A-ZÀ-Ỹ]/g) || []).length;
        if (upper / letters.length > 0.8) {
            return { ok: false, reason: "Không viết toàn chữ IN HOA." };
        }
    }

    return { ok: true };
}

// ══════════════════════════════════════════════════════════════
// HTTP HANDLER
// ══════════════════════════════════════════════════════════════
serve(async (req) => {
    // Preflight CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action, payload } = body;

        // ─────────────────────────────────────────────────
        // ACTION 1: Lấy danh sách bình luận
        // ─────────────────────────────────────────────────
        if (action === "getComments") {
            const { data, error } = await supabaseAdmin
                .from("comments")
                .select("*")
                .order("time", { ascending: false })
                .limit(500);

            if (error) throw error;

            return new Response(JSON.stringify({ ok: true, data }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ─────────────────────────────────────────────────
        // ACTION 2: Gửi bình luận mới
        // ─────────────────────────────────────────────────
        if (action === "postComment") {
            const { name, content, image_url, parent_id, user_token } = payload;

            // Validate
            if (!name || name.trim().length < 2) {
                return jsonError("Tên phải từ 2 ký tự.", 400);
            }
            if (!content || content.trim().length < 5) {
                return jsonError("Nội dung quá ngắn.", 400);
            }
            if (name.length > 40 || content.length > 1000) {
                return jsonError("Nội dung quá dài.", 400);
            }

            // Kiểm tra user có bị chặn không
            if (user_token) {
                const { data: blocked } = await supabaseAdmin
                    .from("blocked_users")
                    .select("id")
                    .eq("user_token", user_token)
                    .limit(1);

                if (blocked && blocked.length > 0) {
                    return jsonError("Tài khoản của bạn đã bị chặn.", 403);
                }
            }

            // Kiểm duyệt nội dung
            const modCheck = moderateContent(content + " " + name);
            if (!modCheck.ok) {
                return jsonError(modCheck.reason || "Nội dung vi phạm.", 400);
            }

            // Insert vào database
            const { error } = await supabaseAdmin.from("comments").insert([{
                name: name.trim(),
                content: content.trim(),
                image_url: image_url || null,
                parent_id: parent_id || null,
                is_admin: false,
                time: Date.now(),
                user_token: user_token || null,
            }]);

            if (error) throw error;

            return new Response(
                JSON.stringify({ ok: true, message: "Gửi thành công!" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─────────────────────────────────────────────────
        // ACTION 3: Kiểm tra user có bị chặn không
        // ─────────────────────────────────────────────────
        if (action === "checkBlocked") {
            const { user_token } = payload;
            if (!user_token) {
                return new Response(JSON.stringify({ ok: true, blocked: false }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            const { data } = await supabaseAdmin
                .from("blocked_users")
                .select("id, reason")
                .eq("user_token", user_token)
                .limit(1);

            return new Response(
                JSON.stringify({
                    ok: true,
                    blocked: data && data.length > 0,
                    reason: data?.[0]?.reason || null,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Action không hợp lệ
        return jsonError("Action không hợp lệ.", 400);

    } catch (err) {
        console.error("Edge Function error:", err);
        return jsonError(err.message || "Lỗi server.", 500);
    }
});

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ ok: false, error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}