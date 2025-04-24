document.addEventListener("DOMContentLoaded", () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
    const mobileMenu = document.querySelector(".mobile-menu")
  
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("active")
      })
    }
  
    // Testimonial Slider
    const dots = document.querySelectorAll(".dot")
    const slides = document.querySelectorAll(".testimonial-slide")
    let currentSlide = 0
  
    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.style.display = i === index ? "block" : "none"
      })
  
      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === index)
      })
    }
  
    if (dots.length > 0 && slides.length > 0) {
      showSlide(currentSlide)
  
      dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
          currentSlide = i
          showSlide(currentSlide)
        })
      })
  
      // Auto slide
      setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length
        showSlide(currentSlide)
      }, 5000)
    }
  
    // Cart Sidebar Toggle
    const cartIcon = document.querySelector(".cart-icon")
    const closeCart = document.querySelector(".close-cart")
    const cartSidebar = document.querySelector(".cart-sidebar")
    const cartOverlay = document.querySelector(".cart-overlay")
  
    if (cartIcon) {
      cartIcon.addEventListener("click", (e) => {
        e.preventDefault()
        cartSidebar.classList.add("active")
        cartOverlay.classList.add("active")
        document.body.style.overflow = "hidden"
      })
    }
  
    if (closeCart) {
      closeCart.addEventListener("click", () => {
        cartSidebar.classList.remove("active")
        cartOverlay.classList.remove("active")
        document.body.style.overflow = ""
      })
    }
  
    if (cartOverlay) {
      cartOverlay.addEventListener("click", () => {
        cartSidebar.classList.remove("active")
        cartOverlay.classList.remove("active")
        document.body.style.overflow = ""
      })
    }
  
    // Quick View Modal
    const quickViewBtns = document.querySelectorAll(".quick-view")
    const modal = document.getElementById("quickViewModal")
    const closeModal = document.querySelector(".close-modal")
    const quickViewContent = document.querySelector(".quick-view-content")
  
    if (quickViewBtns.length > 0) {
      quickViewBtns.forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault()
          e.stopPropagation()
          const productId = this.getAttribute("data-id")
  
          // Here you would fetch the product details from the server
          // For now, we'll just show a placeholder
          quickViewContent.innerHTML = `
            <div class="quick-view-layout">
              <div class="quick-view-image">
                <img src="/placeholder.svg" alt="Product Image">
              </div>
              <div class="quick-view-details">
                <h2>Product Title</h2>
                <div class="quick-view-rating">
                  <i class="fas fa-star"></i>
                  <i class="fas fa-star"></i>
                  <i class="fas fa-star"></i>
                  <i class="fas fa-star"></i>
                  <i class="fas fa-star-half-alt"></i>
                  <span>(42)</span>
                </div>
                <p class="quick-view-price">$24.99</p>
                <p class="quick-view-description">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                <div class="quick-view-actions">
                  <div class="quantity-selector">
                    <button class="quantity-btn minus">-</button>
                    <input type="number" value="1" min="1" class="quantity-input">
                    <button class="quantity-btn plus">+</button>
                  </div>
                  <button class="btn primary-btn add-to-cart-btn">Add to Cart</button>
                </div>
                <div class="quick-view-meta">
                  <p><strong>Category:</strong> Fiction</p>
                  <p><strong>Author:</strong> John Doe</p>
                  <p><strong>ISBN:</strong> 978-3-16-148410-0</p>
                </div>
              </div>
            </div>
          `
  
          modal.style.display = "block"
          document.body.style.overflow = "hidden"
        })
      })
    }
  
    if (closeModal) {
      closeModal.addEventListener("click", () => {
        modal.style.display = "none"
        document.body.style.overflow = ""
      })
    }
  
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none"
        document.body.style.overflow = ""
      }
    })
  
    // Add to Cart Functionality
    const addToCartBtns = document.querySelectorAll(".add-to-cart")
  
    if (addToCartBtns.length > 0) {
      addToCartBtns.forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault()
          e.stopPropagation()
  
          const productId = this.getAttribute("data-id")
          // Here you would add the product to the cart
          // For now, we'll just update the cart count
          const cartCount = document.querySelector(".cart-count")
          cartCount.textContent = Number.parseInt(cartCount.textContent) + 1
  
          // Show a notification
          showNotification("Product added to cart!")
        })
      })
    }
  
    // Notification Function
    function showNotification(message) {
      const notification = document.createElement("div")
      notification.className = "notification"
      notification.textContent = message
  
      document.body.appendChild(notification)
  
      setTimeout(() => {
        notification.classList.add("show")
      }, 10)
  
      setTimeout(() => {
        notification.classList.remove("show")
        setTimeout(() => {
          document.body.removeChild(notification)
        }, 300)
      }, 3000)
    }
  
    // Filter and Sort Functionality
    const filterCheckboxes = document.querySelectorAll('.filter-group input[type="checkbox"]')
    const sortLinks = document.querySelectorAll(".sort-content a")
  
    if (filterCheckboxes.length > 0) {
      filterCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", function () {
          // Here you would filter the products based on the selected filters
          console.log("Filter changed:", this.value, this.checked)
        })
      })
    }
  
    if (sortLinks.length > 0) {
      sortLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault()
  
          // Remove active class from all sort links
          sortLinks.forEach((l) => l.classList.remove("active"))
  
          // Add active class to clicked link
          this.classList.add("active")
  
          const sortValue = this.getAttribute("data-sort")
          // Here you would sort the products based on the selected sort option
          console.log("Sort changed:", sortValue)
        })
      })
    }
  
    // Newsletter Form
    const newsletterForm = document.querySelector(".newsletter-form")
  
    if (newsletterForm) {
      newsletterForm.addEventListener("submit", function (e) {
        e.preventDefault()
  
        const emailInput = this.querySelector('input[type="email"]')
        const email = emailInput.value.trim()
  
        if (email) {
          // Here you would submit the email to the server
          console.log("Newsletter subscription:", email)
  
          // Show success message
          showNotification("Thank you for subscribing to our newsletter!")
  
          // Clear the input
          emailInput.value = ""
        }
      })
    }
  
    // Pagination
    const pageLinks = document.querySelectorAll(".page-link:not(.prev):not(.next)")
    const prevLink = document.querySelector(".page-link.prev")
    const nextLink = document.querySelector(".page-link.next")
  
    if (pageLinks.length > 0) {
      pageLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault()
  
          // Remove active class from all page links
          pageLinks.forEach((l) => l.classList.remove("active"))
  
          // Add active class to clicked link
          this.classList.add("active")
  
          // Enable/disable prev/next links
          if (this.textContent === "1") {
            prevLink.classList.add("disabled")
          } else {
            prevLink.classList.remove("disabled")
          }
  
          if (this.textContent === pageLinks.length.toString()) {
            nextLink.classList.add("disabled")
          } else {
            nextLink.classList.remove("disabled")
          }
  
          // Here you would load the products for the selected page
          console.log("Page changed:", this.textContent)
        })
      })
    }
  
    if (prevLink) {
      prevLink.addEventListener("click", function (e) {
        e.preventDefault()
  
        if (this.classList.contains("disabled")) return
  
        const activePage = document.querySelector(".page-link.active")
        const prevPage = activePage.previousElementSibling
  
        if (prevPage && !prevPage.classList.contains("prev")) {
          prevPage.click()
        }
      })
    }
  
    if (nextLink) {
      nextLink.addEventListener("click", function (e) {
        e.preventDefault()
  
        if (this.classList.contains("disabled")) return
  
        const activePage = document.querySelector(".page-link.active")
        const nextPage = activePage.nextElementSibling
  
        if (nextPage && !nextPage.classList.contains("next")) {
          nextPage.click()
        }
      })
    }
  })
  
  // Sample data for EJS rendering
  // In a real application, this would come from the server
  const bestSellers = [
    {
      id: 1,
      title: "The Silent Patient",
      author: "Alex Michaelides",
      image: "/placeholder.svg",
      price: 24.99,
      rating: 4.5,
      reviewCount: 1289,
    },
    {
      id: 2,
      title: "Where the Crawdads Sing",
      author: "Delia Owens",
      image: "/placeholder.svg",
      price: 19.99,
      rating: 4.8,
      reviewCount: 2341,
    },
    {
      id: 3,
      title: "Atomic Habits",
      author: "James Clear",
      image: "/placeholder.svg",
      price: 22.99,
      rating: 4.9,
      reviewCount: 3782,
    },
    {
      id: 4,
      title: "The Midnight Library",
      author: "Matt Haig",
      image: "/placeholder.svg",
      price: 18.99,
      rating: 4.6,
      reviewCount: 1567,
    },
  ]
  
  const newArrivals = [
    {
      id: 5,
      title: "Project Hail Mary",
      author: "Andy Weir",
      image: "/placeholder.svg",
      price: 26.99,
      rating: 4.7,
      reviewCount: 892,
    },
    {
      id: 6,
      title: "The Last Thing He Told Me",
      author: "Laura Dave",
      image: "/placeholder.svg",
      price: 21.99,
      rating: 4.3,
      reviewCount: 765,
    },
    {
      id: 7,
      title: "The Four Winds",
      author: "Kristin Hannah",
      image: "/placeholder.svg",
      price: 23.99,
      rating: 4.5,
      reviewCount: 1123,
    },
    {
      id: 8,
      title: "The Invisible Life of Addie LaRue",
      author: "V.E. Schwab",
      image: "/placeholder.svg",
      price: 20.99,
      rating: 4.4,
      reviewCount: 987,
    },
  ]
  
  const deals = [
    {
      id: 9,
      title: "The Alchemist",
      author: "Paulo Coelho",
      image: "/placeholder.svg",
      price: 12.99,
      originalPrice: 19.99,
      discountPercentage: 35,
      rating: 4.8,
      reviewCount: 5432,
    },
    {
      id: 10,
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      image: "/placeholder.svg",
      price: 9.99,
      originalPrice: 15.99,
      discountPercentage: 40,
      rating: 4.9,
      reviewCount: 7654,
    },
    {
      id: 11,
      title: "1984",
      author: "George Orwell",
      image: "/placeholder.svg",
      price: 10.99,
      originalPrice: 16.99,
      discountPercentage: 35,
      rating: 4.7,
      reviewCount: 4321,
    },
    {
      id: 12,
      title: "Pride and Prejudice",
      author: "Jane Austen",
      image: "/placeholder.svg",
      price: 8.99,
      originalPrice: 14.99,
      discountPercentage: 40,
      rating: 4.6,
      reviewCount: 3987,
    },
  ]
  