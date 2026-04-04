(function () {
  var STORAGE = "yaaazz_cart_v1";

  function readCart() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(STORAGE, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("yaaazz:cart"));
  }

  function findIndex(items, slug) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].slug === slug) return i;
    }
    return -1;
  }

  window.YaaazzCart = {
    get: readCart,
    count: function () {
      return readCart().reduce(function (n, l) {
        return n + (Number(l.qty) || 0);
      }, 0);
    },
    add: function (item) {
      var items = readCart();
      var slug = String(item.slug);
      var idx = findIndex(items, slug);
      var qty = Math.max(1, Number(item.qty) || 1);
      if (idx === -1) {
        items.push({
          slug: slug,
          title: String(item.title || ""),
          price: Number(item.price) || 0,
          image: String(item.image || ""),
          subtitle: String(item.subtitle || ""),
          isPreOrder: item.isPreOrder || false,
          qty: qty,
        });
      } else {
        items[idx].qty = (Number(items[idx].qty) || 0) + qty;
        items[idx].price = Number(item.price) || items[idx].price;
        if (item.isPreOrder) items[idx].isPreOrder = true;
      }
      writeCart(items);
    },
    setQty: function (slug, qty) {
      var items = readCart();
      var idx = findIndex(items, slug);
      if (idx === -1) return;
      var q = Number(qty);
      if (!q || q < 1) items.splice(idx, 1);
      else items[idx].qty = q;
      writeCart(items);
    },
    remove: function (slug) {
      writeCart(readCart().filter(function (l) {
        return l.slug !== slug;
      }));
    },
    clear: function () {
      writeCart([]);
    },
    subtotal: function () {
      return readCart().reduce(function (sum, l) {
        return sum + (Number(l.price) || 0) * (Number(l.qty) || 0);
      }, 0);
    },
  };

  function money(n) {
    var v = Number(n) || 0;
    return "₱" + v.toLocaleString("en-PH");
  }

  function buildSummary(lines, totals) {
    var out = [];
    out.push("=== YAAAZZ ORDER ===");
    lines.forEach(function (l) {
      var line = "• " + l.qty + " × " + l.title + " — " + money(l.price) + " (line: " + money(l.price * l.qty) + ")";
      if (l.isPreOrder) line += " [PRE-ORDER]";
      out.push(line);
    });
    out.push("Items Subtotal: " + money(totals.subtotal));
    out.push("Shipping Fee: To be calculated by Customer Service");
    out.push("");
    out.push("Shipping details below:");
    return out.join("\n");
  }

  function buyerFromForm() {
    var getName = function(id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : "";
    };
    return {
      name: getName("ship-name"),
      email: getName("ship-email"),
      phone: getName("ship-phone"),
      address: getName("ship-address"),
      barangay: getName("ship-barangay"),
      city: getName("ship-city"),
      province: getName("ship-province"),
      postal: getName("ship-postal")
    };
  }

  window.YaaazzOrderText = {
    compose: function (buyer) {
      var cart = window.YaaazzCart.get();
      var subtotal = window.YaaazzCart.subtotal();
      var base = buildSummary(cart, { subtotal: subtotal });
      var b = buyer || {};
      return (
        base +
        "\n- Shipping Details -" +
        "\nName: " + (b.name || "") +
        "\nPhone: " + (b.phone || "") +
        "\nEmail: " + (b.email || "") +
        "\nAddress: " + (b.address || "") +
        "\nBarangay: " + (b.barangay || "") +
        "\nCity/Municipality: " + (b.city || "") +
        "\nProvince: " + (b.province || "") +
        "\nPostal Code: " + (b.postal || "") +
        "\n"
      );
    },
  };

  function badge(shouldAnimate) {
    var el = document.getElementById("cart-badge");
    if (!el) return;
    var n = window.YaaazzCart.count();
    
    if (n > 0) {
      if (shouldAnimate) {
        el.classList.remove("hidden");
        el.classList.remove("cart-badge-pop");
        void el.offsetWidth;
        el.classList.add("cart-badge-pop");
        
        var parent = el.closest('a');
        if (parent) {
          parent.classList.remove("cart-animate");
          void parent.offsetWidth;
          parent.classList.add("cart-animate");
        }
        
        // Wait 1 sec before changing number
        setTimeout(function() {
          el.textContent = String(n);
        }, 1000);
      } else {
        el.textContent = String(n);
        el.classList.remove("hidden");
      }
    } else {
      el.classList.add("hidden");
    }
  }

  function wireAddButtons() {
    document.querySelectorAll(".js-add-cart").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var slug = btn.getAttribute("data-slug");
        if (!slug) return;
        var isPreOrder = btn.getAttribute("data-preorder") === "true";
        var qtyAttr = btn.getAttribute("data-qty");
        var qtyNum = qtyAttr ? Number(qtyAttr) : 1;

        window.YaaazzCart.add({
          slug: slug,
          title: btn.getAttribute("data-title") || "",
          price: Number(btn.getAttribute("data-price") || 0),
          image: btn.getAttribute("data-image") || "",
          subtitle: btn.getAttribute("data-subtitle") || "",
          isPreOrder: isPreOrder,
          qty: qtyNum,
        });
        badge(true);

        // Rage click protection & aesthetic feedback
        var originalStyle = btn.style.pointerEvents;
        var originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> ADDED! ✨';
        btn.style.pointerEvents = 'none';
        btn.classList.add('opacity-80', 'scale-95');
        setTimeout(function() {
          btn.innerHTML = originalText;
          btn.style.pointerEvents = originalStyle;
          btn.classList.remove('opacity-80', 'scale-95');
        }, 1500);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    badge();
    wireAddButtons();
  });

  window.addEventListener("yaaazz:cart", badge);
})();
