const { Router, response } = require('express');
var express = require('express');
const { unregisterHelper } = require('handlebars');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userhelper = require('../helpers/user-helpers');
const verifylogin = (req, res, next) => {
  if (req.session.userloggedin) {
    next()
  } else {
    res.redirect('/login')
  }
}
const ObjectId = require('mongodb').ObjectId


/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  console.log(user);
  let cartcount = null
  if (user) { cartcount = await userhelper.getcartcount(req.session.user._id) }
  productHelpers.getallproducts().then((products) => {

    res.render('user/view-products', { products, user, cartcount })
  })

})
router.get('/login', (req, res) => {  
  if (req.session.userloggedin) { 
    res.render('user/login')
  } else {
    res.render('user/login', { 'loginerr': req.session.userloginerr })
    req.session.userloginerr = false
  }

})

router.get('/signup', (req, res) => {
  res.render('user/signup')
})
router.post('/signup', (req, res) => {
  userhelper.dosignup(req.body).then((response) => {
    
    req.session.user = response
    req.session.userloggedin = true
    console.log(req.body)
    console.log(response)
    res.redirect('/')
  })
})
router.post('/login', (req, res) => {
  userhelper.dologin(req.body).then((response) => {
    if (response.status) {
      
      req.session.user = response.user
      req.session.userloggedin = true
      res.redirect('/')
    } else {
      req.session.userloginerr = true
      res.redirect('/login')
    }
  })
})

router.get('/logout', (req, res) => {
  req.session.user=null
  res.redirect('/')
})

router.get('/cart', verifylogin, async (req, res) => {
  if(req.session.user!=null){
    let user = req.session.user
    let products = await userhelper.getcartproducts(req.session.user._id)
    let total=0
    console.log(products.length);
    if(products.length>0){
    
    }
    console.log(products);
    console.log('id:' + req.session.user._id);
    res.render('user/cart', { user, products, total})
  }else{
    res.redirect('/login')
  }
 


})

router.get('/home', (req, res) => {
  res.redirect('/')
})

router.get('/add-to-cart/:id', (req, res) => {
  console.log('api call');
  console.log(req.params.id);
  console.log(req.session._id);

  userhelper.addtocart(req.params.id, req.session.user._id).then(() => {

    res.json({ status: true })
 



  })
})

router.post('/change-product-quantity',async (req, res, next) => {
  console.log(req.body);
  userhelper.changeproductquantity(req.body).then(async (response) => {
    let products = await userhelper.getcartproducts(req.session.user._id)
    console.log(products.length);
    if(products.length>0){
    response.total = await userhelper.gettotalamount(req.body.user) 
    }
    console.log(response.total);
    res.json(response)
  })
})
 
router.post('/remove-cart-item', (req, res) => {
  console.log(req.body);
  userhelper.removeproductfromcart(req.body).then((response) => {
    res.json(response)
  })
})


router.get('/place-order', verifylogin, async (req, res) => {
  let user = req.session.user
  let total = await userhelper.gettotalamount(req.session.user._id)
  console.log(total);
  res.render('user/place-order', { total, user })
})

router.post('/place-order', verifylogin, async (req, res) => {
  let user = req.session.user
  let products = await userhelper.getcartproductlist(req.body.userid)
  console.log(products);
  console.log(req.body.userid + 'user:' + req.body.user);
  let totalprice = await userhelper.gettotalamount(req.body.userid)
  console.log(totalprice);
  userhelper.placeorder(req.body, products, totalprice).then((orderid) => {
    console.log(req.body.paymentMethod); 
    if (req.body.paymentMethod == 'COD') {
     
      res.json({ codSuccess: true })
    }
    else{
      userhelper.generateRazorpay(orderid,totalprice).then((response)=>{
        res.json(response)
      })
    }

  })
  console.log(req.body);
})
router.get('/order-success', (req, res) => {
  let user = req.session.user
  res.render('user/order-success', { user })
})

router.get('/orders', verifylogin, async (req, res) => {
  let user = req.session.user
  let orders = await userhelper.getuserorders(req.session.user._id)

  res.render('user/orders', { user, orders })
}),

  router.get('/view-order-products/:id', async (req, res) => {
    let user = req.session.user
    if(user){
      let products = await userhelper.getorderproducts(req.params.id, req.session.user._id)
      console.log("PRODUCTS: " + products);

    res.render('user/view-order-products', { user, products }) 

    }
   
   
  }) 

  router.post('/verify-payment',(req,res)=>{
    console.log(req.body);
    userhelper.verifyPayment(req.body).then(()=>{
      userhelper.changePaymentStatus(req.body['order[receipt]']).then(()=>{
        console.log('payment successfull');
        res.json({status:true})
      })
    }).catch((err)=>{
      res.json({status:false,errMsg:''})
    })  
  })

  

module.exports = router;
