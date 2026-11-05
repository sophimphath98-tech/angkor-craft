/* ==========================================================================
   HELD TOOL SYSTEM (first-person right hand)  -  window.HeldTool

   Renders the tool, weapon or bow in the player's hand as a CSS-posed DOM
   overlay (see held-tool.css for the pose math). It knows nothing about the
   game: game.js feeds it the held item and tells it when things happen.

     HeldTool.supports(kind)          true for pickaxe | axe | shovel | hoe | sword | bow
     HeldTool.setItem(item|null)      item = { id, kind, spriteUrl, enchanted }; returns true when this overlay draws it
     HeldTool.setVisible(bool)        show or hide the whole hand (menus, third person, death...)
     HeldTool.setBob(x, y)            walking bob in game units
     HeldTool.swing()                 melee swing (.is-swinging, 0.15 s)
     HeldTool.setDrawing(on, 0..1)    bow draw state (.is-drawing, arrow + string pull back)
     HeldTool.release(power)          bow release: the string snaps forward (.is-releasing)
     HeldTool.slash()                 full-screen sword slash with sparks

   The markup it drives is the #player-hand-layer / #slash-layer block in index.html.
   ========================================================================== */
(function (global) {
    'use strict';

    // item kind -> class modifier on #player-right-hand
    var KIND_CLASS = {
        pickaxe: 'tool-pickaxe',
        axe: 'tool-axe',
        shovel: 'tool-shovel',
        hoe: 'tool-hoe',
        sword: 'weapon-sword',
        bow: 'ranged-bow'
    };
    var ALL_KIND_CLASSES = Object.keys(KIND_CLASS).map(function (k) { return KIND_CLASS[k]; });

    var els = null;               // cached DOM nodes, resolved on first use
    var current = { key: '', kind: null };
    var visible = false;
    var drawing = false;
    var drawAmount = 0;           // 0..1, the last draw fraction (the string spring starts from it)
    var springRaf = 0;
    var swingTimer = 0;
    var releaseTimer = 0;
    var slashSide = 1;            // alternates so a combo sweeps left, right, left...
    var artCache = {};

    // ---------- DOM lookup ----------
    function dom() {
        if (els) return els;
        var layer = document.getElementById('player-hand-layer');
        var hand = document.getElementById('player-right-hand');
        if (!layer || !hand) return null;
        els = {
            layer: layer,
            hand: hand,
            sprite: hand.querySelector('.held-sprite'),
            arrow: hand.querySelector('.held-arrow'),
            line: hand.querySelector('.bow-string polyline'),
            slash: document.getElementById('slash-layer')
        };
        return els;
    }

    // ---------- Procedural pixel art for the bow and arrow ----------
    // Both are authored pointing +X (the direction the arrow flies) on a 16x16 grid, so the CSS never has to
    // rotate them by an odd angle: the mirrored frame turns +X into "toward the crosshair".
    function canvas16() {
        var c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        var g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        return { c: c, g: g };
    }
    function pixelLine(g, x0, y0, x1, y1, color, thick) {
        var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
        g.fillStyle = color;
        for (var i = 0; i <= n; i++) {
            g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), thick || 1, thick || 1);
        }
    }
    function bowArt() {
        if (artCache.bow) return artCache.bow;
        var a = canvas16(), g = a.g;
        // limb: the grip is the most forward point, the tips curve back toward the archer
        var limb = [[4, 1, 6, 2], [6, 2, 8, 4], [8, 4, 9, 6], [9, 6, 9, 10], [9, 10, 8, 12], [8, 12, 6, 14], [6, 14, 4, 15]];
        limb.forEach(function (s) { pixelLine(g, s[0] + 1, s[1] + 1, s[2] + 1, s[3] + 1, 'rgb(70,44,20)', 2); });
        limb.forEach(function (s) { pixelLine(g, s[0], s[1], s[2], s[3], 'rgb(150,104,50)', 2); });
        limb.forEach(function (s) { pixelLine(g, s[0], s[1], s[2], s[3], 'rgb(190,140,70)', 1); });
        g.fillStyle = 'rgb(96,66,34)';                     // leather grip wrap
        g.fillRect(8, 7, 3, 3);
        g.fillStyle = 'rgb(70,44,20)';
        g.fillRect(8, 9, 3, 1);
        artCache.bow = a.c.toDataURL();
        return artCache.bow;
    }
    function arrowArt() {
        if (artCache.arrow) return artCache.arrow;
        var a = canvas16(), g = a.g;
        // The tail (nock) ends at x=4, right where the string rests, so a pulled-back arrow sits behind it
        g.fillStyle = 'rgb(92,62,30)';  g.fillRect(5, 9, 8, 1);        // shaft shadow
        g.fillStyle = 'rgb(160,116,60)'; g.fillRect(5, 8, 8, 1);       // shaft
        g.fillStyle = 'rgb(70,72,78)';                                  // flint head outline
        g.fillRect(13, 7, 1, 1); g.fillRect(13, 9, 1, 1); g.fillRect(14, 8, 1, 1); g.fillRect(15, 8, 1, 1);
        g.fillStyle = 'rgb(176,178,186)';                               // flint head
        g.fillRect(14, 7, 1, 1); g.fillRect(14, 9, 1, 1); g.fillRect(13, 8, 1, 1);
        g.fillStyle = 'rgb(236,236,240)';                               // fletching
        g.fillRect(4, 7, 3, 1); g.fillRect(4, 9, 3, 1); g.fillRect(4, 6, 2, 1); g.fillRect(4, 10, 2, 1);
        g.fillStyle = 'rgb(150,150,158)';
        g.fillRect(6, 6, 1, 1); g.fillRect(6, 10, 1, 1);
        artCache.arrow = a.c.toDataURL();
        return artCache.arrow;
    }

    // ---------- Bow string ----------
    // The string is a 3-point polyline in the 16x16 sprite grid: top tip, nock, bottom tip.
    // nock = 0 at rest, 1 at full draw, below 0 = overshooting forward after release.
    var STRING_X = 4.5, STRING_TOP = 1.5, STRING_BOTTOM = 14.5, STRING_MID = 8;
    function setNock(nock) {
        var e = dom();
        if (!e || !e.line) return;
        var unit = e.hand.getBoundingClientRect().width / 16 || 12;
        var distPx = Math.max(8, unit * 1.1);                  // same value as --draw-dist in the CSS
        var x = STRING_X - nock * distPx / unit;
        e.line.setAttribute('points', STRING_X + ',' + STRING_TOP + ' ' + x.toFixed(2) + ',' + STRING_MID + ' ' + STRING_X + ',' + STRING_BOTTOM);
    }
    function stopSpring() {
        if (springRaf) cancelAnimationFrame(springRaf);
        springRaf = 0;
    }
    // After release the string flies forward past rest and rings out: a damped oscillation of the nock
    function snapString(fromNock) {
        stopSpring();
        var t0 = performance.now();
        (function step(now) {
            var t = (now - t0) / 1000;
            if (t > 0.3) { setNock(0); springRaf = 0; return; }
            setNock(fromNock * Math.exp(-t * 15) * Math.cos(t * 58));
            springRaf = requestAnimationFrame(step);
        })(t0);
    }

    // ---------- State helpers ----------
    function restart(el, cls) {
        // Re-adding a class does not restart a running CSS animation; remove it, force a reflow, add it again
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
    }

    var HeldTool = {
        supports: function (kind) { return !!KIND_CLASS[kind]; },

        setItem: function (item) {
            var e = dom();
            if (!e || !item || !KIND_CLASS[item.kind]) {
                current = { key: '', kind: null };
                if (e) e.layer.classList.remove('is-visible');
                visible = false;
                if (drawing) HeldTool.setDrawing(false);
                return false;
            }
            var key = item.id + '|' + item.kind + '|' + (item.enchanted ? 1 : 0);
            if (key !== current.key) {
                current = { key: key, kind: item.kind };
                ALL_KIND_CLASSES.forEach(function (c) { e.hand.classList.remove(c); });
                e.hand.classList.add(KIND_CLASS[item.kind]);
                e.hand.classList.remove('is-swinging', 'is-drawing', 'is-releasing', 'is-full');
                drawing = false;
                stopSpring();

                var url = item.kind === 'bow' ? bowArt() : item.spriteUrl;
                e.sprite.src = url;
                e.hand.style.setProperty('--sprite-mask', 'url("' + url + '")');
                if (item.kind === 'bow') { e.arrow.src = arrowArt(); setNock(0); }
                e.hand.classList.toggle('is-enchanted', !!item.enchanted);
            }
            e.layer.classList.toggle('is-visible', visible);
            return true;
        },

        setVisible: function (v) {
            var e = dom();
            visible = !!v && !!current.kind;
            if (e) e.layer.classList.toggle('is-visible', visible);
        },

        setBob: function (x, y) {
            var e = dom();
            if (!e || !visible) return;
            // 3D hand offsets are tiny (0.02 units); this scale makes the 2D hand sway about as far as the old one
            var px = (x * 650).toFixed(1) + 'px', py = (-y * 650).toFixed(1) + 'px';
            if (e.hand._bob !== px + py) {
                e.hand._bob = px + py;
                e.hand.style.setProperty('--bob-x', px);
                e.hand.style.setProperty('--bob-y', py);
            }
        },

        // Melee swing. A bow does not swing; it recoils in release().
        swing: function () {
            var e = dom();
            if (!e || !visible || !current.kind || current.kind === 'bow') return;
            restart(e.hand, 'is-swinging');
            clearTimeout(swingTimer);
            swingTimer = setTimeout(function () { e.hand.classList.remove('is-swinging'); }, 170);
        },

        setDrawing: function (on, amount) {
            var e = dom();
            if (!e || current.kind !== 'bow') return;
            if (on) {
                if (!drawing) {
                    drawing = true;
                    stopSpring();
                    clearTimeout(releaseTimer);
                    e.hand.classList.remove('is-releasing');
                    e.hand.classList.add('is-drawing');
                }
                drawAmount = Math.max(0, Math.min(1, amount || 0));
                e.hand.style.setProperty('--draw', drawAmount.toFixed(3));
                e.hand.classList.toggle('is-full', drawAmount >= 1);
                setNock(drawAmount);
            } else if (drawing) {
                drawing = false;
                e.hand.classList.remove('is-drawing', 'is-full');
                setNock(0);
            }
        },

        // The arrow is gone, the string snaps forward and rings out, the bow kicks back
        release: function (power) {
            var e = dom();
            if (!e || !visible || current.kind !== 'bow') return;
            var from = typeof power === 'number' ? Math.max(0, Math.min(1, power)) : drawAmount;
            drawing = false;
            e.hand.classList.remove('is-drawing', 'is-full');
            restart(e.hand, 'is-releasing');
            snapString(from || 0.6);
            clearTimeout(releaseTimer);
            releaseTimer = setTimeout(function () { e.hand.classList.remove('is-releasing'); }, 240);
        },

        // A bright streak sweeping across the middle of the screen plus a few sparks
        slash: function () {
            var e = dom();
            if (!e || !e.slash) return;
            slashSide = -slashSide;
            var streak = document.createElement('div');
            streak.className = 'slash-sweep';
            streak.style.setProperty('--dir', slashSide);
            streak.style.top = (44 + Math.random() * 6).toFixed(1) + '%';
            e.slash.appendChild(streak);
            streak.addEventListener('animationend', function () { streak.remove(); });

            for (var i = 0; i < 7; i++) {
                var spark = document.createElement('i');
                spark.className = 'slash-spark';
                var along = (Math.random() - 0.5) * 0.6;                         // spread along the streak
                spark.style.left = (50 + along * 70) + '%';
                spark.style.top = (46 + (Math.random() - 0.5) * 8) + '%';
                spark.style.setProperty('--sx', (slashSide * (30 + Math.random() * 90)).toFixed(0) + 'px');
                spark.style.setProperty('--sy', ((Math.random() - 0.3) * 80).toFixed(0) + 'px');
                spark.style.animationDelay = (Math.random() * 0.06).toFixed(3) + 's';
                e.slash.appendChild(spark);
                spark.addEventListener('animationend', function (ev) { ev.target.remove(); });
            }
        }
    };

    global.HeldTool = HeldTool;
})(window);
