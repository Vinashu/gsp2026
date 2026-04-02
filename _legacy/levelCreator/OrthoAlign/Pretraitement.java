
import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.Arrays;

public class Pretraitement

	{

		    String X, Y, Z;
		    
		    
		    
		   public Pretraitement(){} ;
		    
		   public Pretraitement (String st1, String st2)
		   {
			   
			   this.X=st1;
			   this.Y=st2;
			   
			   
		   }
		
		   
		   
		  
		  
		  
		  
		
		   
		   
		   /**
			 *  preKmp (x): determine le plus long prefix de [i..n] qui est suffixe de [i..n] pour chaque position dans x.
			 *
			 **/
		   
		   public static int[] preKmp4(int[] x, int p) {
			   
				int m=p+1+1;
				int kmpNext[]=new int[m];
				int i, j;

				   i = 0;
				   j = kmpNext[0] = -1;
				   
				   while (i < m-2 ) {
				      while (j > -1 && x[m-2-i] != x[m-2-j])
				         j = kmpNext[j];
				      i++;
				      j++;
				      if (x[m-2-i] == x[m-2-j])
				         kmpNext[i] = kmpNext[j];
				      else
				         kmpNext[i] = j;
				   }
				
				   
				   
				   while (j > -1 && x[m-2-i] != x[m-2-j])
				         j = kmpNext[j];
				   
				   
				   
				   kmpNext[m-1] = j+1;
				   
				   
					   //for (int h=m-1; h>=0; h--)
						   //System.out.print(kmpNext[h]+" ");
				 
				   
				   return kmpNext;
				   
				      
				}
		   
		   
		   
		   
		   /**
			 *  preMp4 (x): determine le plus long prefix de [i..n] qui est suffixe de [i..n] pour chaque position dans x.
			 * Base sur l'algorithme Morris et pratt
			 **/
		   
		   public static int[] preMp4(int[] x, int p) {
			   
				int m=p+1+1;
				int kmpNext[]=new int[m];
				int i, j;

				   i = 0;
				   j = kmpNext[0] = -1;
				   
				   while (i < m-2 ) {
				      while (j > -1 && x[m-2-i] != x[m-2-j])
				         j = kmpNext[j];
				      i++;
				      j++;
				      
				         kmpNext[i] = j;
				   }
				
				   
				   
				   while (j > -1 && x[m-2-i] != x[m-2-j])
				         j = kmpNext[j];
				   
				   
				   
				   kmpNext[m-1] = j+1;
				   
				   
					   //for (int h=m-1; h>=0; h--)
						   //System.out.print(kmpNext[h]+" ");
				 
				   
				   return kmpNext;
				   
				      
				}
		   
		  
		  
		   
		   /**
			 *
			 *  maxDup (T, p, kmpNextP): determiner la derniere position de la plus
			 *  longue occurrence qui commence a la position p de T dans T.
			 *  P : pattern
			 *  T : texte sur lequel porte la recherche
			 *  p : position de debut de la recherche
			 *  kmpNextP : tableau contenant les plus longs prefixe qui sont suffixe... 
			 *  
			 */
		   
		   
		   
		   static Occurrence maxDup(int[] T, int p, int []kmpNextP) 
		    
		   {
			   int i, j, l;

			   int m=p+1;
			   int n=T.length;
			   
			   
			   /* Searching */
			   i = l = 0;
			   
			   j=n-1; 
			   
			   int v=0; // pour sauvegarder la derniere position de la plus longue occurrence
			   
			   while (j >= 0) {
				     
				   //les deux dernieres conditions servent a eviter le chevauchement entre les deux textes
				   
			      while  (i > -1 && ( (T[m-1-i] != T[j]) || (j+i==p-i) || (j==p)) ) 
			    	  
			      {
			    	  
			    	 //System.out.println("Difference i= "+i+", j= "+j);
			         i = kmpNextP[i];
			         
			         //System.out.println("Nouvelle valeur de i = "+i);
			         
			      }
			      
			      /*
			      
			      if (( j==p)) 
				  {
					  System.out.println("egalite "+i);
					  i=-1;
					  
				  }
			      
			      */
			      
			      /*
			      
			      if (i!=-1) 
			      {
			    	  System.out.println("i= "+i+", j= "+j);
			    	  if (T[m-1-i] == T[j]) System.out.println("egalite i= "+i+", j= "+j);
			      }
			      
			      */
			      
			      i++;
			      j--;
			      
			      //System.out.println("Prochaine comparaison "+"i= "+i+", j= "+j);
			      
			      //System.out.println("j= "+j);
			      
			      if (i >= l) 
			      {
			    	  l=i; 
			    	  v=j+1;
			      }
			      
			      if (i >= m) i = kmpNextP[i];
			      
			   }
			   
			   //System.out.println("l="+l);
			   
			   if (l>0) return new Occurrence ((p+1-l),v+l-1);
			   
			   return new Occurrence (-1,-1);
			   
		   }
		   
		   
		   /**
			 *
			 *  maxDup (T, P, p, kmpNextP): determiner la derniere position de la plus
			 *  longue occurrence qui commence a la position p de P dans T.
			 *  P : pattern
			 *  T : texte sur lequel porte la recherche
			 *  p : position de debut de la recherche
			 *  kmpNextP : tableau contenant les plus longs prefixe qui sont suffixe... 
			 *  
			 *  Valeurs de retour : 
			 *  1 : derniere position de la plus longue occurrence qui commence a p
			 *  2 : position de debut de son occurrence choisie
			 *  
			 */
		   
		   
		   
		   static Occurrence maxDup(int[] T, int []P, int p, int []kmpNextP) 
		    
		   {
			   int i, j, l;

			   int m=p+1;
			   int n=T.length;
			   
			   
			   /* Searching */
			   i = l = 0;
			   
			   j=n-1; 
			   
			   int v=0; // pour sauvegarder la derniere position de la plus longue occurrence
			   
			   while (j >= 0) {
				     
				   //les deux dernieres conditions servent a eviter le chevauchement entre les deux textes
				   
			      while  (i > -1 && ( P[m-1-i] != T[j] || P[m-1-i] == 91140 || T[j] == 91140 ) ) 
			    	  
			      {
			    	  
			    	 //System.out.println("Difference i= "+i+", j= "+j);
			         i = kmpNextP[i];
			         
			         //System.out.println("Nouvelle valeur de i = "+i);
			         
			      }
			      
			      /*
			      
			      if (( j==p)) 
				  {
					  System.out.println("egalite "+i);
					  i=-1;
					  
				  }
			      
			      */
			      
			      /*
			      
			      if (i!=-1) 
			      {
			    	  System.out.println("i= "+i+", j= "+j);
			    	  if (T[m-1-i] == T[j]) System.out.println("egalite i= "+i+", j= "+j);
			      }
			      
			      */
			      
			      i++;
			      j--;
			      
			      //System.out.println("Prochaine comparaison "+"i= "+i+", j= "+j);
			      
			      //System.out.println("j= "+j);
			      
			      if (i >= l) 
			      {
			    	  l=i; 
			    	  v=j+1;
			      }
			      
			      if (i >= m) i = kmpNextP[i];
			      
			   }
			   
			   //System.out.println("l="+l);
			   
			   if (l>0) return new Occurrence ((p+1-l),v+l-1);
			   
			   return new Occurrence (-1,-1);
			   
		   }
		   
		   
		   /**
			 *
			 *  allmaxDup (T, P): Creer un tableau dont les elements representent 
			 *  la derniere position de la plus longue occurence de chaque position dans T
			 *  P : pattern
			 *  T : texte sur lequel porte la recherche
			 */
		   
		   static Occurrence []allmaxDup(int[] T) 
		    
		   {
			   Occurrence []res=new Occurrence[T.length];
			   
			   
			   for (int i=0; i<T.length; i++)
				   
			   {
				
				   int[] kmpNextP=preMp4(T,i);
				   res[i]=maxDup(T,i, kmpNextP);
				   
			   }
			   
			   
			   return res;
			   
		   }
		   
		   
		   /**
			 *
			 *  allmaxDup (T, P): Creer un tableau dont les elements representent la derniere 
			 *  position de la plus longue occurence de chaque position dans P
			 *  P : pattern
			 *  T : texte sur lequel porte la recherche
			 */
		   
		   static Occurrence []allmaxDup(int []P, int[] T ) 
		    
		   {
			   Occurrence []res=new Occurrence[P.length];
			   
			   
			   for (int i=0; i<P.length; i++)
				   
			   {
				
				   int[] kmpNextP=preKmp4(P,i);
				   res[i]=maxDup(T, P, i, kmpNextP);
				   
			   }
			   
			   
			   return res;
			   
		   }
		   
		   
		   
		   
		   
		   
		   /**
			 *
			 *  maxInv (T, iT, p, kmpNextP): determiner la derniere position 
			 *  de la plus longue occurrence inverse de T[1..p]
			 *  T : texte sur lequel porte la recherche
			 *  iT : inverse de T
			 *  p : taille du suffixe T[1..p]
			 *  kmpNextP : tableau contenant les plus longs prefixe qui sont suffixe.
			 *  Valeurs de retour : 
			 *  1 : derniere position de la plus longue occurrence qui commence a p
			 *  2 : position de debut de son occurrence inverse choisie
			 *  
			 */
			 
		   
		   static Occurrence maxInv(int[] T, int []iT, int p, int []kmpNextP) 
		    
		   {
			   int i, j, l;

			   int m=p+1;
			   int n=T.length;
			   
			   
			   /* Searching */
			   i = l = 0;
			   
			   j=n-1; 
			   
			   int v=0;
			   
			   while (j >= 0) {
				     
			      while  ( i > -1  && (T[m-1-i] != iT[j])) 
			    	  
			      { 
			    		  i = kmpNextP[i];
			    	
			      }
			      
			      
			      
			      
			      // meme si le i = -1, ceci ne change pas le comportement de la condition if
			      // car p+1 <= n-1-j et p>n-j est une condition fausse
			      
			      if ( ( p-i<=n-1-j ) && (n-1-j-i)<p) // empecher des chvauchement
				  {
					  //System.out.println("egalite "+i);
					  i=0;
					  j=n-1-p-1; // recommencer la recherche a la position p+1 avec i=0
				  }
			      
			      	
			      else
			      			      
			      {			      
			      
			    	 i++;
			    	 j--;
			      
			      }
			      
			      //System.out.println("j= "+j);
			      
			      if (i > l)  // garder la plus longue inversion la plus a droite
			    	
			      {
			    	  //System.out.println("l= "+l);
			    	  l=i; 
			    	  v=j+1;
			      }
			      
			      if (i >= m) j=-1;
			      
			   }
			   
			   v=n-1-v;
			   
			   //System.out.println("l="+l);
			   
			   if (l>0) return new Occurrence ((p+1-l),v-l+1) ;  // premiere position est l'original
			   
			   return new Occurrence (-1, -1);
			   
		   }
		   
		   
		   /**
			 *
			 *  maxInvP (T, P, p, kmpNextP): determiner la derniere position 
			 *  de la plus longue occurrence inverse de T[1..p]
			 *  T : texte sur lequel porte la recherche
			 *  p : taille du suffixe T[1..p]
			 *  kmpNextP : tableau contenant les plus longs prefixe qui sont suffixe.
			 *
			 *  Remarque : cette procédure nécéssite un prétraitement dans lequel il
			 *  faut inverser T. On suppose que iT est l'inverse de T
			 *  Valeurs de retour : 
			 *  1 : derniere position de la plus longue occurrence qui commence a p
			 *  2 : position de debut de son occurrence inverse choisie 
			 *  
			 */
			 
		   
		   static Occurrence maxInvP(int []P, int[] iT, int p, int []kmpNextP) 
		    
		   {
			   int i, j, l;

			   int m=p+1;
			   int n=iT.length;
			   
			   
			   /* Searching */
			   i = l = 0;
			   
			   j=n-1; 
			   
			   int v=0;
			   
			   while (j >= 0) {
				     
			      while  (i > -1 && (P[m-1-i] != iT[j] || P[m-1-i] == 91140 || iT[j] == 91140 ) ) 
			    	  
			      {
			    	  
			    	
			         i = kmpNextP[i];
			         
			      }
			      			      
			      i++;
			      j--;
			      
			      //System.out.println("j= "+j);
			      
			      if (i > l)  // garder la plus longue inversion la plus a droite
			    	
			      {
			    	  //System.out.println("l= "+l);
			    	  l=i; 
			    	  v=j+1;
			      }
			      
			      if (i >= m) j=-1;
			      
			   }
			   
			   v=n-1-v;
			   
			   //System.out.println("l="+l);
			   
			   if (l>0) return new Occurrence ((p+1-l),v-l+1) ;  // je pense que la premiere est l'original
			   
			   return new Occurrence (-1, -1);
			   
		   }
		   
		   
		   
		   
		   
		   
		   
		   
		   
		   /**
			 *
			 *  allMaxInv (T): determiner la derniere position 
			 *  de la plus longue occurrence inverse de chaque position de T
			 *  T : texte sur lequel porte la recherche
			 *  kmpNextP : tableau contenant les plus longs prefixe qui sont suffixe.
			 *
			 *  Remarque : cette procédure nécéssite un prétraitement dans lequel il
			 *  faut inverser T. On suppose que iT est l'inverse de T
			 */
		   
		   static Occurrence []allMaxInv(int[] T, int []iT) 
		    
		   {
			   int n=T.length;
			   
			   //int []iT=new int [n];
			   
			   	//pretraitement
			   
			   /*
			   
			   for (int i=0; i<n; i++)
		        	
		        	{
		        	
		        	int v=T[i];
		        	iT[i]=-T[n-1-i] ;
			   	    iT[n-1-i]=v;
			   		
			   		}
			   
			   */
			   
			   Occurrence []res=new Occurrence[n];
			   
			   
			   for (int i=0; i<n; i++)
				   
			   {
				
				   int[] kmpNextP=preKmp4(T,i);
				   
				   res[i]=maxInv(T, iT, i, kmpNextP);
				   
			   }
			   
			   
			   return res;
			   
		   }
		   
		   /**
			 *
			 *  allmaxInvP (T,P): determiner la derniere position 
			 *  de la plus longue occurrence inverse de chaque position de P dans iT
			 *  T : texte sur lequel porte la recherche
			 *  kmpNextP : tableau contenant les plus longs prefixe qui sont suffixe.
			 *
			 *  Remarque : cette procédure nécéssite un prétraitement dans lequel il
			 *  faut inverser T. 
			 */
		   
		   static Occurrence []allMaxInvP(int []P, int[] T) 
		    
		   {
			   int n=T.length;
			   
			   int m=P.length;
			   
			   	//pretraitement
			   
			   /*
			   
			   for (int i=0; i<n; i++)
		        	
		        	{
		        	
		        	iT[i]=-T[n-1-i] ;
			   	    
			   		}
			   
			   
			   */
			   
			   
			   Occurrence []res=new Occurrence[m];
			   
			   
			   for (int i=0; i<m; i++)
				   
			   {
				
				   int[] kmpNextP=preKmp4(P,i);
				   
				   res[i]=maxInvP(P, T, i, kmpNextP);
				   
			   }
			   
			   
			   return res;
			   
		   }
		   
		   
		   
		   
		   
		   
		   
		   
		   /* La suite du code est utilisee dans la classe Alignmt11
		    * 
		    * 
		    */
		   
		   /*
		    * Partie 1 : Procedures requises pour les inversions
		    */
		   
		   /**
			 *
			 *  allLongSufInvX (iT, P, p, kmpNextP): determiner la taille de tous les plus 
			 *  longs suffixes de T qui sont inverses du suffixe P[0..p]
			 *  P : pattern
			 *  iT : l'inverse de T, texte sur lequel porte la recherche
			 *  p : taille particuliere du pattern P[0..p]
			 *  kmpNextP : tableau contenant les plus longs prefixe de P qui sont suffixe. 
			 *  
			 *  Remarque : cette procédure nécéssite un prétraitement dans lequel il
			 *  faut inverser T. On suppose que T a déjà été inversé
			 */
		   
		   static int []allLongSufInvX(int[] T,int[] P, int p, int []kmpNextP) 
		    
		   {
			   int i, j, l;

			   int m=p+1;
			   int n=T.length;
			   
			   int []res=new int[T.length];
			   
			   //pretraitement
			   
			   /* 
			   
			   for (int i=0; i<T.length; i++)
		        	
		        	{
		        	
		        	int v=T[i];
		        	T[i]=-T[n-1-i] ;
			   	    T[n-1-i]=v;
			   		
			   		}
			   
			   */
			   
			   
			   /* Searching */
			   
			   i = l = 0;
			   
			   j=n-1; 
			   
			   int v=0;
			   
			   while (j >= 0) {
				   
				   
			      while  (i > -1 && (P[m-1-i] != T[j]) ) 
			    	  
			      {
			         i = kmpNextP[i];
			         
			      }
			      
			      res[n-1-j]=i+1;
			      
			      i++;
			      j--;
			      	 
			      if (i >= m) i = kmpNextP[i];
			      
			   }
			   
			   return res;
			   
		   }
		   
		   
		   
		   
		   static ArrayList [] allLongSufInvX2(int[] T,int[] P, int p, int []kmpNextP) 
		    
		   {
			   int i, j, l;

			   int m=p+1;
			   int n=T.length;
			   
			   ArrayList<Integer>[] res=new ArrayList[T.length];
			   
			   for (int h=0; h<T.length; h++)
			   
			   {
				   res[h]=new ArrayList<Integer>();
				   //res[h].add(0);
			   }
			   
			   //pretraitement
			   
			   /* 
			   
			   for (int i=0; i<T.length; i++)
		        	
		        	{
		        	
		        	int v=T[i];
		        	T[i]=-T[n-1-i] ;
			   	    T[n-1-i]=v;
			   		
			   		}
			   
			   */
			   
			   
			   /* Searching */
			   
			   int val=n-1;
			   
			   while (val>=0)
				   
			   {	   
			   
			   j=val;
			   
			   i = l = 0;
			   
			   int v=0;
			   
			   while (j >= 0 && i<m &&  ( (P[m-1-i] == T[j]) || ( i>0 && (P[m-1-i]==91140) && (P[m-1-i] == -T[j])  ) ) )
			   
			   {
				   
				   res[n-1-j].add(i+1);
			        
			       j--;	  
			       i++;
			      
			   }
			   
			   val--;
			   
			   }
			   
			   return res;
			   
		   }
		   
		   
		   
		   
		   static ArrayList<Integer>[][]allLongSufInvXY2(int[] T,int[] P) 
		    
		   {
			   
			   ArrayList<Integer> [][]res=new ArrayList[P.length][T.length];
			   
			   for (int i=0; i<P.length; i++)
				   
			   {
				
				   int[] kmpNextP=preKmp4(P,i);
				   res[i]=allLongSufInvX2(T,P,i, kmpNextP);
				   
			   }
			   
			   
			   return res;
			   
			   
		   }
		   
		   
		   
		   
		   
		   /*
		   
		   *  Ceci est l'anciennce procedure allLongSufInvX2 sans tenir compte des inversions autour du terminus
		   *
		   *
		   
		   
		   
		   static ArrayList [] allLongSufInvX2(int[] T,int[] P, int p, int []kmpNextP) 
		    
		   {
			   int i, j, l;

			   int m=p+1;
			   int n=T.length;
			   
			   ArrayList<Integer>[] res=new ArrayList[T.length];
			   
			   for (int h=0; h<T.length; h++)
			   
			   {
				   res[h]=new ArrayList<Integer>();
				   //res[h].add(0);
			   }
			   
			   
			   int val=n-1;
			   
			   while (val>=0)
				   
			   {	   
			   
			   j=val;
			   
			   i = l = 0;
			   
			   int v=0;
			   
			   while (j >= 0 && i<m && (P[m-1-i] == T[j]))
			   
			   {
				   
				   res[n-1-j].add(i+1);
			        
			       j--;	  
			       i++;
			      
			   }
			   
			   val--;
			   
			   }
			   
			   return res;
			   
		   }
		   
		   
		   
		   
		   */
		   
		   
		   /**
			 *
			 *  allLongSufInvXY (iT, P): determiner la taille de tous les plus 
			 *  longs suffixes de T qui sont inverses des suffixes de P
			 *  P : pattern
			 *  iT : l'inverse de T, texte sur lequel porte la recherche
			 *  
			 *  Remarque : cette procédure nécéssite un prétraitement dans lequel il
			 *  faut inverser T. On suppose que T a déjà été inversé
			 */
		   
		   static int [][]allLongSufInvXY(int[] T,int[] P) 
		    
		   {
			   
			   int [][]res=new int[P.length][T.length];
			   
			   for (int i=0; i<P.length; i++)
				   
			   {
				
				   int[] kmpNextP=preKmp4(P,i);
				   res[i]=allLongSufInvX(T,P,i, kmpNextP);
				   
			   }
			   
			   
			   return res;
			   
			   
		   }
		   
		 
		   
		   
		   /**
			 *
			 *  allCourtSufInvX (iT, P, p, kmpNextP): determiner la taille de tous les plus 
			 *  courts suffixes de T qui sont inverses du suffixe P[0..p]
			 *  P : pattern
			 *  iT : l'inverse de T, texte sur lequel porte la recherche
			 *  p : taille particuliere du pattern P[0..p]
			 *  kmpNextP : tableau contenant les plus longs prefixe de P qui sont suffixe. 
			 *  
			 *  Remarque : cette procédure nécéssite un prétraitement dans lequel il
			 *  faut inverser T. On suppose que T a déjà été inversé
			 */
		   
		   
		   static int []allCourtSufInvX(int[] T,int[] P, int p) 
		    
		   {
			   int i, j, v1, v2;

			   int m=p+1;
			   int n=T.length;
			   
			   int []res=new int[T.length];
			   
			   Arrays.fill(res, 0);
			   
			   //pretraitement
			   
			   /* 
			   
			   for (int i=0; i<T.length; i++)
		        	
		        	{
		        	
		        	int v=T[i];
		        	T[i]=-T[n-1-i] ;
			   	    T[n-1-i]=v;
			   		
			   		}
			   
			   */
			   
			   
			   /* Searching */
			   
			   i = v2 = 0;
			   
			   v1=-1;
			   
			   
			   
			   j=0; 
			   
			   int v=0;
			   
			   while (j < n) {
				   
				   
				   
				   
				  if (P[m-1-i] == T[j]) 
					  
				  {
					  
					  
					  v2=j;
					  while  ((i < m) && (j>v1) && (P[m-1-i] == T[j]) ) 
					  {
						  System.out.println("Egalite entre "+(m-1-i)+" et "+j);
						  
						  
						  res[n-1-j]=i+1;
						  
						  i++;
						  j--;
						  
					  }
			    	  
					  v1=v2;
					  j=v2; 
					  
				  }
			    	  
				  j++;
				  i=0;
				  
				  
			   }
			   
			   return res;
			   
		   }
		   
		   
		   
		   /**
			 *
			 *  allCourtSufInvXY (T, P, p, kmpNextP): determiner la taille de tous les plus 
			 *  courts suffixes de T qui sont inverses des suffixes de P
			 *  P : pattern
			 *  iT : l'inverse de T, texte sur lequel porte la recherche
			 *  p : taille particuliere du pattern P[0..p]
			 *  kmpNextP : tableau contenant les plus longs prefixe de P qui sont suffixe. 
			 *  
			 *  Remarque : cette procédure nécéssite un prétraitement dans lequel il
			 *  faut inverser T. On suppose que T a déjà été inversé
			 */
		   
		   
		   static int [][]allCourtSufInvXY(int[] T,int[] P) 
		    
		   {
			   int [][]res=new int[P.length][T.length];
			   
			   for (int i=0; i<P.length; i++)
				
				   res[i]=allCourtSufInvX(T,P,i);
				
			   return res;
			   
		   }
		   
		   
		   static int []Position(int[] T) 
		    
		   {
			   int t=T.length;
			   
			   int []res=new int[t];
			   
			   int i=0;
			   
			   while (i<t && T[i]!=91140) i++;
			   
			   if (i==t) i--;
			   
			   for (int j=0; j<=i ; j++)
				
				   res[j]=0;
			   
			   
			   
			   for (int j=i+1; j<t ; j++)
					
				   res[j]=1;
				
			   
			   
			  
			   
			   return res;
			   
		   }
		   
		   
		   
		   
		   
		   
		   
		   
		   /*
		    * Partie 2 : Procedures requises pour les duplications inverses
		    */
		   
		   
		   
		   
		   
		   	 public static void main(String []arg)
		 
		 {
			 int []X=new int []{1,2,3,-4,-7,-6,-5,8,9,10};
			 
			 int []IX=new int [X.length];
			 
			 int []X1=new int []{1,2,3,4,5,2,2,6,7,-2,-5,-4,-3,-2,-2};
			 
			 int n1=X1.length;
			 
			 int []IX1=inverser(X1);
			 
			 
			 
			 int []X2=new int []{1,2,3,4,5,1,2,3,4,5,1,2,3};
			 
			 int n2=X2.length;
			 
			 int []X3=new int []{-3,-2,-1,-5,-4,-3,-2,-1,-5,-4,-3,-2,-1};
			 
			 int []IX2=X3;
			 
			 Occurrence []T=allMaxInv(X1, IX1);
			 
			 System.out.println("-----------");
		        
			 //Afficher(T);
			 
			 
			 
		     //System.out.println(maxDup(X2,12,preKmp4(X2,12)).j);
			 
			 
			 //int []Y=allCourtSufInvX(IX2,X3,X3.length-1);
			 
			 //int []Y2=allLongSufInvX(IX2,X3,X3.length-1, preKmp4(X3,X3.length-1));
			 
			 
			 //int []t2=preKmp4(Y,5);
		        
		        
		        //int []t3=preKmp4(t,7);
		        
			 int []X4=new int []{1,2,3,-5,5,-3,-2,5};
			 
			 int []IX4=new int []{-5,2,3,-5,5,-3,-2,-1};
			 
			 int n5=X4.length;
			 
			 
			 
			 
			    //int t=maxInv(X4, IX4, 2, preKmp4(X4,2));
			    
			    //System.out.println(t);
			    
		        //System.out.println(maxOcc5(X,Y,5,Y)); 
		        
		        //System.out.println(maxOcc4(t,t,7,t3));
		        
		        //System.out.println(maxOcc2("iuobcaxabaaa","caabaaa",6,t));
		        
		        //t=preKmp2("caabaa");
		        //System.out.println(maxOcc2("iuobcaxabaaa","caabaaa",5,t));
		        
		        //t=preKmp2("caaba");
		        //System.out.println(maxOcc2("iuobcaxabaaa","caabaaa",4,t));
		        
		        //System.out.print(t);
		        	
			    
			    //for (int i=0; i<Y.length; i++)
		        	//System.out.print(Y[i]+" ") ;
			    
			    
		        System.out.println();
		        
		        
		        
		        String s2="16SrRNA IGAT ATGC 23SrRNA 5SrRNA STGA 16SrRNA IGAT ATGC 23SrRNA 5SrRNA MCAT ETTC 16SrRNA 23SrRNA 5SrRNA 16SrRNA 23SrRNA 5SrRNA NGTT TGGT ETTC ATAC YGTA QTTG KTTT GGCC ATGC NGTT SGCT ETTC ATAC DGTC QTTG KTTT LGAG RACG PTGG GTCC 16SrRNA 23SrRNA 5SrRNA XCAT DGTC XCAT DGTC 16SrRNA 23SrRNA 5SrRNA 16SrRNA 23SrRNA 5SrRNA 16SrRNA 23SrRNA 5SrRNA 16SrRNA 23SrRNA 5SrRNA 16SrRNA 23SrRNA 5SrRNA NGTT SGGA ETTC ATAC XCAT DGTC FGAA TTGT YGTA WCCA HGTG QTTG GGCC CGCA LCAA GTCC 16SrRNA 23SrRNA 5SrRNA ATAC YGTA QTTG KTTT LTAG GGCC LTAA RACG PTGG ATGC STGA STGA XCAT DGTC FGAA TTGT WCCA IGAT NGTT ETTC KTTT ETTC DGTC FGAA RCCG 16SrRNA 23SrRNA 5SrRNA ATAC TTGT HGTG LTAG GGCC LTAA RACG PTGG ATGC MCAT JCAT STGA XCAT DGTC FGAA TTGT KTTT GTCC IGAT NGTT SGCT ETTC GTCC DTTG JCAT VGAC" ;
				
		        String []s4=s2.split(" ");
		        
		        int []X5=new int[s4.length];
		        
		        for (int i = 0; i < X5.length; i++) 
					
					X5[i] = (s4[i].hashCode());
		        
		        
		        
		        int []X6={1,2,3,4,5,6,1,2,3,4,5,6,1,2,3,4,5,6};//taille 18 
		        
		        Coordinates c=Couverture(X6, 0, 5);
		        
		        System.out.println("droite "+c.y+", gauche "+c.x);
		        
		        System.out.println();
		        
		        //System.out.println(X5[52]);
		        
		        System.out.println(maxDup(X6,5,preMp4(X6,5)).j);
		        
		        //int []h=preKmp4(X6,17);
		        
		        //for (int i = 0; i < h.length; i++) 
					
		        	//System.out.print(h[i]+" ");
		        
		        
		        
		        int []A={8,8,8,8,8,8,8,1,2,3,4,5,1,2,3,4,5,1,2,3};
		        
		        int []iA=inverser(A);
		        
		        int []B={9,9,9,9,9,-3,-2,-1,-5,-4,-3,-2,-1,-5,-4,-3,-2,-1};
		        
		        int []kmp=preKmp4(B,17);
		        
		        int[]Res1=allCourtSufInvX(iA,B,9);
		        
		        int[]Res2=allLongSufInvX(iA,B,17,kmp);
		        
		        Afficher(Res1);
		        
		        
		        Position(B);
		        
		        
		        
		        }
			 
		
		 public static int []inverser(int T[])
		 	{
			 int n=T.length;
			 int res[]=new int[n];
			 
			 for (int i=0; i<n; i++)
				 res[i]=-T[n-1-i];
			 
			 return res;
			 
		 	}
		 
		 public static void Afficher(int T[])
		 	{
			 int n=T.length;
			 
			 for (int i=0; i<n; i++)
				 System.out.print(T[i]+", ");
			 
		 	}
		 
		 
		 public static Coordinates Couverture(int []X, int d, int g)
			
			{
			    int dc=-1, gc=-1; // les deux extremites de la chaine couverture initialisees a -1
			    
			    boolean found=false, bound=false;
			    
			
				int k=X.length-1; // k prend la derniere position de la chaine 
				
				if (g>k || d<0)  // verifie s'il n y a pas de debordement 
					
					{ 
					
					    System.out.println("Message from Couverture: coordinates out of bound");
					 	return null;
					}
				
				
				while (!found && !bound)
					
				{	
				
				while( (k>g) && (k-g > g-d) && (X[g]!=X[k]) )  k--;
				
				
				if ( (k>g) && (k-g > g-d) )
					
					{
					   
					   int a=g;
					   int b=k;
					   
					   while((a>=d) && (X[a]==X[b]))
					   	{
						   
						   a--; b--;
						   
					   	}
						    
					if (a<d) // alors chaine ou couverture trouvee
						{
						       found=true; 
						       
						       dc=k-g+d;  
						       gc=k;
						    	   
						} 
					
					    
					
					else k--;
					
					}
				
				else bound=true;
				
				}
				
				
				k=d-1;
				
				while (!found && bound)
				
					{
					
					while( (k >= g-d) && (X[g]!=X[k]) )  k--;
					
					
					if ( k >= g-d )
						
					{
					
						int a=g;
						int b=k;
					   
					   while((a>=d) && (X[a]==X[b]))
					   	{
						   
						   a--; b--;
						   
					   	}
						    
					if (a<d) 
						
					{
					       found=true; 
					       
					       dc=k-g+d; 
					       gc=k;
					    	   
					} 
					  
					     else k--;
					
					}
				
					
					else bound=false; // pour sortir de la boucle
					
					
					
					}
					
				
				//System.out.println("dc= "+dc+", gc= "+gc);
			
				if (found) return new Coordinates(g-d+1, dc, gc);
				
				return new Coordinates(0,-1,-1);
				
				
			
			
			}
		 
		 
		 
		
	}



