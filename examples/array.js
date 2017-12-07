run("do(define(sum , fun(array , ",
    "do(define(i , 0),",
    "     define(sum , 0) , ",
    "     while(<(i , lenght(array)),",
    "       do(define(sum , +(sum , element(array , i))) ,",
    "           define(i , + (i , 1)))) ,",
    "      sum))) ,",
    "       print(sum(array(1 , 2 , 3))))")