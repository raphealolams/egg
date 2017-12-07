run(" do (define(pow , fun(base , exp ,",
    " if (==(exp , 0) ,",
    " 1 ,",
    " *(base , pow (base , -( exp , 1)))))) ,",
    " print (pow(2 , 10) ) ) ");
// ! 1024