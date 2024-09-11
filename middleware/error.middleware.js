
// inherit the class Error and named it as ErrorHandler to handle  error 

class ErrorHandler extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  
  
  // creating the component named errorMiddleware which handle the error 
  //  A error middleware have (err,req,res,next)=>{}
  
  export const errorMiddleware = (err, req, res, next) => {
    err.message = err.message || "Internal Server Error";
    err.statusCode = err.statusCode || 500;
  
  
    // if the entered entry is duplicate then it through error of 11000 code
    if (err.code === 11000) {
      const message = `Duplicate ${Object.keys(err.keyValue)} Entered`,
      // creating the instance object of Errorhandler Class 
        err = new ErrorHandler(message, 400);
    }
  
    // if error is jsonwebtoken is invalid then it through error
    if (err.name === "JsonWebTokenError") {
      const message = `Json Web Token is invalid, Try again!`;
      // creating the instance object of Errorhandler Class 
      err = new ErrorHandler(message, 400);
    }
  
    // token is expired thne through error
    if (err.name === "TokenExpiredError") {
      const message = `Json Web Token is expired, Try again!`;
      // creating the instance object of Errorhandler Class 
      err = new ErrorHandler(message, 400);
    }
    if (err.name === "CastError") {
      const message = `Invalid ${err.path}`,
      // creating the instance object of Errorhandler Class 
        err = new ErrorHandler(message, 400);
    }
  
    
    const errorMessage = err.errors
      ? Object.values(err.errors)
        .map((error) => error.message)
        .join(" ")
      : err.message;
  
    return res.status(err.statusCode).json({
      success: false,
      message: errorMessage,
    });
  };
  
  export default ErrorHandler;