fetch("http://localhost:3000/products")
  .then(r => r.json())
  .then(items => {
    document.getElementById("products").innerHTML =
      items.map(p => `<li>${p.name}: EUR ${p.price}</li>`).join("");
  });
