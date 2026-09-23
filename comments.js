import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

document.addEventListener('DOMContentLoaded', () => {
    // ══════════════════════════════════════════════════════
    // CẤU HÌNH
    // - Anon key CHỈ dùng cho Storage upload (an toàn, có RLS)
    // - Comments API gọi qua Edge Function → KHÔNG lộ key
    // ══════════════════════════════════════════════════════
    const SUPABASE_URL = 'https://fskpfnchptijxsrnpqrc.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZza3BmbmNocHRpanhzcm5wcXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMjEyOTAsImV4cCI6MjEwNTY5NzI5MH0.-NvjiA4OrlMMqHJC5KbX8236SOEFItjFFDryNzFg4_E';
    const API_URL = `${SUPABASE_URL}/functions/v1/comments-api`;
    const BUCKET = 'comment-images';
    const MAX_REPLY_DEPTH = 3;
    const USER_TOKEN_KEY = 'anthony_user_token';

    // Chỉ dùng Supabase client cho Storage upload
    const db = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ══════════════════════════════════════════════════════
    // USER TOKEN
    // ══════════════════════════════════════════════════════
    function getUserToken() {
        let token = localStorage.getItem(USER_TOKEN_KEY);
        if (!token) {
            token = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
            localStorage.setItem(USER_TOKEN_KEY, token);
        }
        return token;
    }

    const USER_TOKEN = getUserToken();

    // ══════════════════════════════════════════════════════
    // GỌI EDGE FUNCTION
    // ══════════════════════════════════════════════════════
    async function callAPI(action, payload = {}) {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Lỗi server');
        return data;
    }

    // ══════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════
    function formatTime(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 30) return `${days} ngày trước`;
        return new Date(ts).toLocaleDateString('vi-VN');
    }
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    function getInitials(name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }
    function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function highlightText(text, keyword) {
        const escaped = escapeHtml(text);
        if (!keyword) return escaped;
        try {
            const re = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
            return escaped.replace(re, '<mark>$1</mark>');
        } catch (e) { return escaped; }
    }

    let allComments = [];
    let replyToId = null;
    let uploadedImageFile = null;
    let isBlocked = false;
    let searchTerm = '';

    // ══════════════════════════════════════════════════════
    // KIỂM TRA BỊ CHẶN
    // ══════════════════════════════════════════════════════
    async function checkBlocked() {
        try {
            const result = await callAPI('checkBlocked', { user_token: USER_TOKEN });
            if (result.blocked) {
                isBlocked = true;
                const notice = document.getElementById('blocked-notice');
                if (notice) notice.style.display = 'flex';
                const btn = document.getElementById('submit-btn');
                if (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.4';
                    btn.style.cursor = 'not-allowed';
                }
            }
        } catch (err) {
            console.warn('Không kiểm tra được block status:', err);
        }
    }

    // ══════════════════════════════════════════════════════
    // SEARCH
    // ══════════════════════════════════════════════════════
    function matchesSearch(comment) {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (comment.name || '').toLowerCase().includes(term) ||
               (comment.content || '').toLowerCase().includes(term);
    }

    function filterTree(comment, allComments) {
        const childReplies = allComments.filter(c => c.parent_id === comment.id);
        if (matchesSearch(comment)) return true;
        return childReplies.some(child => filterTree(child, allComments));
    }

    // ══════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════
    function renderComments() {
        const list = document.getElementById('comments-list');
        const emptyState = document.getElementById('empty-state');
        const countEl = document.getElementById('comment-count');
        const searchInfo = document.getElementById('search-info');

        countEl.textContent = `${allComments.length} bình luận`;

        if (allComments.length === 0) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            emptyState.querySelector('p').textContent = 'Chưa có bình luận nào. Hãy là người đầu tiên!';
            searchInfo.style.display = 'none';
            return;
        }

        const roots = allComments.filter(c => !c.parent_id).sort((a, b) => b.time - a.time);

        let displayRoots = roots;
        let matchCount = 0;
        if (searchTerm) {
            displayRoots = roots.filter(r => filterTree(r, allComments));
            matchCount = allComments.filter(matchesSearch).length;
            searchInfo.style.display = 'block';
            if (matchCount === 0) {
                searchInfo.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:var(--danger)"></i> Không tìm thấy kết quả cho "<strong>${escapeHtml(searchTerm)}</strong>"`;
            } else {
                searchInfo.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Tìm thấy <strong>${matchCount}</strong> kết quả cho "<strong>${escapeHtml(searchTerm)}</strong>"`;
            }
        } else {
            searchInfo.style.display = 'none';
        }

        if (displayRoots.length === 0) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            emptyState.querySelector('p').textContent = 'Không có bình luận nào khớp với tìm kiếm.';
            return;
        }

        emptyState.style.display = 'none';
        list.innerHTML = displayRoots.map(c => renderCommentTree(c, allComments, 0)).join('');
    }

    function renderCommentTree(comment, allComments, depth) {
        const replies = allComments.filter(c => c.parent_id === comment.id).sort((a, b) => a.time - b.time);
        const canReply = depth < MAX_REPLY_DEPTH && !isBlocked;
        const visibleReplies = searchTerm ? replies.filter(r => filterTree(r, allComments)) : replies;
        const isMatch = searchTerm && matchesSearch(comment);

        return `
            <div class="comment-card ${isMatch ? 'highlight-match' : ''}" data-id="${comment.id}">
                <div class="comment-header">
                    <div class="avatar ${comment.is_admin ? 'admin-avatar' : ''}">${escapeHtml(getInitials(comment.name))}</div>
                    <div class="comment-meta">
                        <div class="comment-author">
                            ${highlightText(comment.name, searchTerm)}
                            ${comment.is_admin ? '<span class="admin-badge">ADMIN</span>' : ''}
                        </div>
                        <div class="comment-time">${formatTime(comment.time)}</div>
                    </div>
                </div>
                <div class="comment-content">${highlightText(comment.content, searchTerm).replace(/\n/g, '<br>')}</div>
                ${comment.image_url ? `<img src="${comment.image_url}" class="comment-image" alt="Ảnh" onclick="openImageModal('${comment.image_url}')">` : ''}
                <div class="comment-actions">
                    ${canReply ? `<button class="action-btn reply-btn" data-id="${comment.id}" data-name="${escapeHtml(comment.name)}"><i class="fa-solid fa-reply"></i> Trả lời</button>` : ''}
                </div>
                ${visibleReplies.length ? `<div class="comment-replies">${visibleReplies.map(r => renderCommentTree(r, allComments, depth + 1)).join('')}</div>` : ''}
            </div>
        `;
    }

    // ══════════════════════════════════════════════════════
    // DOM ELEMENTS
    // ══════════════════════════════════════════════════════
    const form = document.getElementById('comment-form');
    const nameInput = document.getElementById('name');
    const contentInput = document.getElementById('content');
    const imageInput = document.getElementById('image');
    const fileUpload = document.getElementById('file-upload');
    const imagePreview = document.getElementById('image-preview');
    const formMessage = document.getElementById('form-message');
    const charCount = document.getElementById('char-count');
    const replyIndicator = document.getElementById('reply-indicator');
    const replyToName = document.getElementById('reply-to-name');
    const cancelReplyBtn = document.getElementById('cancel-reply');
    const submitText = document.getElementById('submit-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');

    // ══════════════════════════════════════════════════════
    // SEARCH
    // ══════════════════════════════════════════════════════
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.trim();
        clearSearchBtn.classList.toggle('visible', !!searchTerm);
        renderComments();
    });
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchTerm = '';
        clearSearchBtn.classList.remove('visible');
        renderComments();
        searchInput.focus();
    });

    // ══════════════════════════════════════════════════════
    // FORM EVENTS
    // ══════════════════════════════════════════════════════
    contentInput.addEventListener('input', () => { charCount.textContent = contentInput.value.length; });
    fileUpload.addEventListener('click', () => imageInput.click());
    ['dragenter', 'dragover'].forEach(evt => {
        fileUpload.addEventListener(evt, (e) => { e.preventDefault(); fileUpload.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(evt => {
        fileUpload.addEventListener(evt, (e) => { e.preventDefault(); fileUpload.classList.remove('dragover'); });
    });
    fileUpload.addEventListener('drop', (e) => {
        const f = e.dataTransfer.files[0];
        if (f) handleImageFile(f);
    });
    imageInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImageFile(e.target.files[0]); });

    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) { showMessage('error', 'Chỉ chấp nhận file ảnh.'); return; }
        if (file.size > 10 * 1024 * 1024) { showMessage('error', 'Ảnh vượt quá 10MB.'); return; }
        uploadedImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview"><button type="button" class="remove-img">×</button>`;
            imagePreview.style.display = 'block';
            imagePreview.querySelector('.remove-img').addEventListener('click', () => {
                uploadedImageFile = null;
                imageInput.value = '';
                imagePreview.style.display = 'none';
                imagePreview.innerHTML = '';
            });
        };
        reader.readAsDataURL(file);
    }

    function showMessage(type, text) {
        formMessage.className = `form-message ${type}`;
        const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
        formMessage.innerHTML = `<i class="fa-solid ${icon}"></i> ${text}`;
        clearTimeout(showMessage._t);
        showMessage._t = setTimeout(() => {
            formMessage.className = 'form-message';
            formMessage.innerHTML = '';
        }, 5000);
    }

    // ══════════════════════════════════════════════════════
    // SUBMIT
    // ══════════════════════════════════════════════════════
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isBlocked) { showMessage('error', 'Tài khoản của bạn đã bị chặn.'); return; }

        const name = nameInput.value.trim();
        const content = contentInput.value.trim();
        [nameInput, contentInput].forEach(i => i.classList.remove('invalid'));

        if (!name || name.length < 2) { nameInput.classList.add('invalid'); showMessage('error', 'Tên phải từ 2 ký tự.'); return; }
        if (!content || content.length < 5) { contentInput.classList.add('invalid'); showMessage('error', 'Nội dung quá ngắn.'); return; }

        showMessage('success', 'Đang gửi bình luận...');

        try {
            // Upload ảnh (dùng Storage trực tiếp với anon key - an toàn)
            let imageUrl = null;
            if (uploadedImageFile) {
                const ext = uploadedImageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;
                const { error: upErr } = await db.storage.from(BUCKET).upload(fileName, uploadedImageFile);
                if (upErr) throw upErr;
                const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
            }

            // Gửi comment qua Edge Function
            await callAPI('postComment', {
                name, content, image_url: imageUrl,
                parent_id: replyToId || null,
                user_token: USER_TOKEN
            });

            form.reset();
            uploadedImageFile = null;
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
            charCount.textContent = '0';
            cancelReply();
            showMessage('success', 'Bình luận đã đăng thành công! 🎉');
        } catch (err) {
            console.error('Lỗi:', err);
            showMessage('error', err.message || 'Lỗi không xác định');
        }
    });

    // ══════════════════════════════════════════════════════
    // LOAD + REALTIME
    // ══════════════════════════════════════════════════════
    async function loadInitialComments() {
        try {
            const result = await callAPI('getComments');
            allComments = result.data || [];
            renderComments();
        } catch (err) {
            console.error('Lỗi tải bình luận:', err);
        }
    }

    db.channel('public:comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
            if (payload.eventType === 'INSERT') {
                if (!allComments.find(c => c.id === payload.new.id)) allComments.push(payload.new);
            } else if (payload.eventType === 'DELETE') {
                allComments = allComments.filter(c => c.id !== payload.old.id);
            } else if (payload.eventType === 'UPDATE') {
                const idx = allComments.findIndex(c => c.id === payload.new.id);
                if (idx > -1) allComments[idx] = payload.new;
            }
            renderComments();
        })
        .subscribe();

    // ══════════════════════════════════════════════════════
    // REPLY
    // ══════════════════════════════════════════════════════
    function startReply(id, name) {
        if (isBlocked) return;
        replyToId = id;
        replyToName.textContent = name;
        replyIndicator.classList.add('active');
        submitText.textContent = 'Gửi trả lời';
        document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        contentInput.focus();
    }
    function cancelReply() {
        replyToId = null;
        replyIndicator.classList.remove('active');
        submitText.textContent = 'Gửi bình luận';
    }
    cancelReplyBtn.addEventListener('click', cancelReply);
    document.getElementById('comments-list').addEventListener('click', (e) => {
        const replyBtn = e.target.closest('.reply-btn');
        if (replyBtn) startReply(replyBtn.dataset.id, replyBtn.dataset.name);
    });

    // ══════════════════════════════════════════════════════
    // MOBILE MENU + IMAGE MODAL
    // ══════════════════════════════════════════════════════
    const mobileMenuBtn = document.getElementById('mobile-menu');
    const navbar = document.getElementById('navbar').querySelector('ul');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navbar.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-xmark');
        });
    }

    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    document.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('active'); });
    window.openImageModal = (src) => { modalImg.src = src; modal.classList.add('active'); };

    // ══════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════
    checkBlocked();
    loadInitialComments();
});