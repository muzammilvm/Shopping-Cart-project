const { response } = require('express');
var express = require('express');
const ObjectId = require('mongodb').ObjectId
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var producthelper = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')
const verifylogin = (req, res, next) => {
  if (req.session.adminloggedin) {
    next()
  } else {
    res.redirect('/admin/admin-login')
  }
}

/* GET users listing. */
router.get('/',verifylogin, function (req, res, next) {
  let administrator=req.session.admin
  productHelpers.getallproducts().then((products) => {

    res.render('admin/view-product', { admin: true, products ,administrator})
  })

})

router.get('/add-product',verifylogin, function (req, res) {

  res.render('admin/add-product', { admin: true })

})
router.post('/add-product', (req, res) => {
  console.log(req.body)
  console.log(req.files.image)
  productHelpers.addproduct(req.body, (id) => {
    var image = req.files.image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render("admin/add-product", { admin: true });

      } else {
        console.log(err);
      }
    })


  })

})

router.get('/delete', (req, res) => {

})
router.get('/delete-product/:id', (req, res) => {
  let prodid = req.params.id
  console.log('removed');
  productHelpers.deleteproduct(prodid).then((response) => {
    res.redirect('/admin')
  })

})

router.get('/edit-product/:id', async (req, res) => {
  console.log(req.params.id);
  let product = await productHelpers.getproductdetails(req.params.id)
  console.log(product);
  res.render("admin/edit-product", { admin: true, product })

})
router.post('/edit-product/:id', (req, res) => {
  let id = req.params.id
  console.log(id);
  productHelpers.updateproduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files.image) {
      let image = req.files.image
      image.mv('./public/product-images/' + id + '.jpg')


    }
  })
})
router.get('/placed-orders', (req, res) => {
  let orders = producthelper.getuserorders().then((orders) => {
    console.log('orders: ' + orders);
    res.render("admin/placed-orders", { admin: true, orders});
  })


})

router.get('/Ship-order/:id', (req, res) => {
  console.log("hello");

  id = req.params.id
  console.log(id);

  productHelpers.changeStatus(id).then(() => {
    res.redirect('/admin/placed-orders');
  })
})

router.get('/admin-login', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { 'loginerr': req.session.adminloginerr, admin: true })
    req.session.adminloginerr = false
  }


})

router.get('/admin-signup', (req, res) => {
  res.render('admin/admin-signup', { admin: true })
})
router.post('/admin-signup', (req, res) => {
  productHelpers.dosignup(req.body).then((response) => {

    req.session.admin = response
    req.session.adminloggedin = true
    console.log(req.body)
    console.log(response)
    res.redirect('/admin')
  })
})
router.post('/admin-login', (req, res) => {
  productHelpers.dologin(req.body).then((response) => {
    console.log(response);
    if (response.status) {

      req.session.admin =response.admin
      req.session.adminloggedin = true
      res.redirect('/admin')
    } else {
      req.session.adminloginerr = true
      res.redirect('/admin/admin-login')
    }
  })
})

router.get('/admin-logout', (req, res) => {
  req.session.admin = null
  res.redirect('/admin')
})




module.exports = router 
