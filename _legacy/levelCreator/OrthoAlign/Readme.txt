
OrthoAlign : Aligns two gene orders under duplication, loss, substitutions and rearrangement
events (inversions and transpositions). The output is an ancestral gene orders, together 
with a scenario of "visible" (source and target still present in either one of the two 
gene orders) evolutionary events from the ancestor to the given gene orders.

Author :  Billel Benzaid
Contact :  benzaidb@iro.umontreal.ca

Dr. Nadia El-Mabrouk Laboratory
Departement d'Informatique et Recherche Operationnelle
Universite de Montreal

For more information on the underlying algorithm, see file tRNA-Evol.pdf in this package.
The paper is submitted to "Molecular Biology and Evolution".


USAGE NOTES :
--------------------------------------------------------

Java Aligning  -dt  genome1  genome2  neighbour[Optional]


Parameters description :


-d show a labeled alignment (and its cost) of genome1 and genome2

-t show running time

genome1, genome2 and neighbour are strings of genes separated by ','

gene names are strings

neighbour is optional

The considered genomes are uni-chromosomal. In the case of circular
genomes, the origin [o] of replication must be at the start of the
genome (before the first gene) and the terminus [t] of replication can
be anywhere. See EXAMPLES for examples of the accepted format.
It is the user's responsibility to generate input compatible with the program.



EXAMPLES : 
--------------------------------------------------------

 Java  Aligning  -d  [o],abc,dfe,[t],cvd  [o],abc,[t],fdsg,cvd  [o],abc,dfe,[t],cvd

 Java  Aligning  -t  [o],abc,dfe,[t],cvd  [o],abc,[t],dfe,cvd  

 Java  Aligning  -dt  abc,dfe,cvd  abc,fdsg,abc


EXAMPLE WITH OUTPUT : 
--------------------------------------------------------

Input :

Java  Aligning  -dt     [o],Ser,16S,Ile,Ile,23S,5S,Met,23S,5S,Met,Glu,-Glu,Glu,Val,
Met,Asp,Phe,Thr,Tyr,Trp,His,Gln,Gly,Cys,Leu,Leu,Gly,Val,[t],-Arg,-5S,Gln,-Arg,-Arg,
-Glu,-Ser,-Asn,-Ile,-Gly,-His,-Phe,-Asp,-Met,-Ser,-Met,-Met     [o],Ser,16S,Ile,Ala,
23S,5S,Met,Glu,Val,Met,Asp,Phe,Thr,Tyr,Trp,His,Gln,Gly,Cys,Leu,Leu,Gly,Arg,[t],-Val,
Gln,-Arg,-Arg,-Glu,-Ser,-Asn,-Ile,-Gly,-His,-Phe,-Asp,-Met,-Ser,-Met,-Met


Output :


Detailed Results
****************

   Genome X   ---   Genome Y      Operation
   ========   ---   ========      =========

      [o]_1   ---   [o]_48        
      Ser_2   ---   Ser_49        
      16S_3   ---   16S_50        
      Ile_4   ---   Ile_51        
      Ile_5   ---   Ala_52        Substitution
      23S_6   ---   23S_53        
       5S_7   ---   5S_54         
      Met_8   ---   Met_55        
      23S_9   ---   .             Duplication of 23S_9...Glu_12 copied from 23S_53...Glu_56
      5S_10   ---   .          
     Met_11   ---   .          
     Glu_12   ---   .          
    -Glu_13   ---   .             Loss of -Glu_13...-Glu_13
     Glu_14   ---   Glu_56        
     Val_15   ---   Val_57        
     Met_16   ---   Met_58        
     Asp_17   ---   Asp_59        
     Phe_18   ---   Phe_60        
     Thr_19   ---   Thr_61        
     Tyr_20   ---   Tyr_62        
     Trp_21   ---   Trp_63        
     His_22   ---   His_64        
     Gln_23   ---   Gln_65        
     Gly_24   ---   Gly_66        
     Cys_25   ---   Cys_67        
     Leu_26   ---   Leu_68        
     Leu_27   ---   Leu_69        
     Gly_28   ---   Gly_70        
     Val_29   ---   Arg_71        Inversion of Val_29...-Arg_31 with Arg_71...-Val_73
     [t]_30   ---   [t]_72     
    -Arg_31   ---   -Val_73    
     -5S_32   ---   .             Loss of -5S_32...-5S_32
     Gln_33   ---   Gln_74        
    -Arg_34   ---   -Arg_75       
    -Arg_35   ---   -Arg_76       
    -Glu_36   ---   -Glu_77       
    -Ser_37   ---   -Ser_78       
    -Asn_38   ---   -Asn_79       
    -Ile_39   ---   -Ile_80       
    -Gly_40   ---   -Gly_81       
    -His_41   ---   -His_82       
    -Phe_42   ---   -Phe_83       
    -Asp_43   ---   -Asp_84       
    -Met_44   ---   -Met_85       
    -Ser_45   ---   -Ser_86       
    -Met_46   ---   -Met_87       
    -Met_47   ---   -Met_88       


>=== Total cost = 5

Running time 00:00:00

>Ancestor:
[o],Ser,16S,Ile,Ile,23S,5S,Met,-Glu,Glu,Val,Met,Asp,Phe,Thr,Tyr,Trp,His,Gln,Gly,Cys,Leu,
Leu,Gly,Val,[t],-Arg,-5S,Gln,-Arg,-Arg,-Glu,-Ser,-Asn,-Ile,-Gly,-His,-Phe,-Asp,-Met,-Ser,-Met,-Met
