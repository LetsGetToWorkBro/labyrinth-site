/**
 * Whether Rolling for Ribbons has reached its goal, for every page that talks about the match.
 *
 * Two anonymous donors each match every dollar raised, up to the goal, so passing it ends the match and the words
 * "triple your gift" stop being true. A page that says them marks those words data-goal-not and the words that replace
 * them data-goal-only (see scripts/build_pages.py), and style.css shows one set or the other by what is written on <html>:
 * data-goal="reached". This file writes it. /donate does not load this file, because fund.js there already has the total.
 *
 * It asks the same event-donations function the donation page does, at most once a minute for a visit, remembers the answer
 * for the visit (sessionStorage) so the next page can put it back before it paints, and says nothing at all when it cannot
 * find out: a page that has not heard keeps the words of a drive that is still on.
 *
 * ?preview=goal on any of these pages shows the reached version ahead of time (with a tag that says so) and is never remembered.
 */
(function () {
  'use strict';

  var root = document.documentElement;

  if (/[?&]preview=goal\b/.test(window.location.search)) {
    root.setAttribute('data-goal', 'reached');
    root.setAttribute('data-preview', 'goal');
    return;
  }

  var me = document.currentScript;
  var url = me && me.getAttribute('data-endpoint');
  if (!url || !window.fetch) return;

  function recall(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function remember(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* private mode: ask again next time */ } }

  // Asked within the last minute, on this page or the one before it: that answer stands.
  if (Date.now() - (Number(recall('goalAsked')) || 0) < 60000) return;
  remember('goalAsked', String(Date.now()));

  var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);

  fetch(url, { signal: ctrl ? ctrl.signal : undefined })
    .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
    .then(function (d) {
      clearTimeout(timer);
      if (typeof d.raised !== 'number' || !(d.goal > 0)) return;
      var reached = d.raised >= d.goal;
      remember('goalReached', reached ? '1' : '0');
      if (reached) root.setAttribute('data-goal', 'reached');
      else root.removeAttribute('data-goal');
    })
    .catch(function () { clearTimeout(timer); });
})();
