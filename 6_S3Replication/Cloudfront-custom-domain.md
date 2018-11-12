# Alternate Domain Name with SSL Certificate

This is an optional lab. Currently, our web application is using cloudfront.net domain name (eg: https://d111111abcdef8.cloudfront.net). Let's configure it to use our own domain name  (eg: www.example.com).

## Request a SSL Certificate for the web application
Launch [AWS Certificate Manager console](https://console.aws.amazon.com/acm/home?region=us-east-1#/) in `us-east-1`. Enter your domain name for the web application (eg: www.example.com) and click `Next`. Select `DNS validation` and `Review` followed by `Confirm and request`. In the Validation page, expand on the domain name and click on `Create record in Route 53`. This will populate your Route53 hosted zone with the CNAME record to validate this domain name.

## Edit CloudFront Distribution 
Launch the [CloudFront console](https://console.aws.amazon.com/cloudfront/home#distributions:) and select the CloudFront distribution created in Module 2.

To add Alternate Domain Name and SSL Certificate:
* Click on `Edit`
* Enter a domain name under `Alternate Domain Names`, eg: `www.example.com` , (substituting your own domain)
*  Select Custom SSL Certificate, and in the input box below, select the Custom SSL Certificate that was created above.
* Click `Yes, Edit` to save the configuration

## Update Route53
* Launch [Route53 Console] (https://console.aws.amazon.com/route53/home#hosted-zones:) and select your Hosted Zone.
* Click `Create Record Set` and specific the following: **Name** : `www.example.com`  (substituting your own domain name), **Type** : Choose `A – IPv4 address`, **Alias**: Choose `Yes`, **Alias Target**: Choose the CloudFront distribution for the web application. **Routing Policy**: Select `Simple` and **Evaluate Target Health**: `No`
* Choose `Create`

You should be able to launch your web application using the new domain name. Take note to update Facebook App's `App Domains` and `Site URL` so that Facebook login will work with the new domain name.


