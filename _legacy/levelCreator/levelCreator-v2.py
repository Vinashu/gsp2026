from __future__ import print_function
import sys
import random

aminoAcidsList = ['Ala', 'Arg', 'Asn', 'Asp', 'Cys', 'Gln', 'Glu', 'Gly', 'His', 'Ile', 'Leu', 'Lys', 'Met', 'Phe', 'Pro', 'Ser', 'Thr', 'Trp', 'Tyr', 'Val']
DUP_PROB = 1.0/3.0 
DEL_PROB = 1.0/3.0
INV_PROB = 1.0/3.0


def geometricSampling(p):
    value = 1
    while random.random() > p:
        value += 1
    return value

def getPosOutsideOfRange(totalSize, start, stop):
    while True:
        position = int(random.random() * totalSize)
        if position not in range(start+1, stop+1):  #position can't be inside [start, stop]
            break
    return position


def performInversion(p, beforeT, afterT):
    #print("Inversion")
    #print(beforeT + ",[t]," + afterT)
    
    beforeT = beforeT.split(",")
    afterT = afterT.split(",")
    
    sizeBeforeT = min(geometricSampling(p), len(beforeT))
    sizeAfterT = min(geometricSampling(p), len(beforeT))

    reversedPartBeforeT = beforeT[len(beforeT)-sizeBeforeT:][::-1]
    reversedPartAfterT = afterT[:sizeAfterT][::-1]

    print("Inversion of " + ','.join(reversedPartBeforeT[::-1]) + ",[t]," + ','.join(reversedPartAfterT[::-1]))  #re-reversing for printing

    if reversedPartBeforeT != ['']:
        newAfterT = reversedPartBeforeT + afterT[sizeAfterT:]
    else:
        newAfterT = afterT[sizeAfterT:]
    
    newBeforeT = beforeT[:len(beforeT)-sizeBeforeT]
    if reversedPartAfterT != ['']:
        newBeforeT += reversedPartAfterT

    #print("SizeBeforeT = " + str(sizeBeforeT) + "   and sizeAfterT = " + str(sizeAfterT))
    #print(','.join(newBeforeT) + ",[t]," + ','.join(newAfterT))

    #print("newBeforeT : " + str(newBeforeT))
    #print("newAfterT : " + str(newAfterT))   
    
    return ','.join(newBeforeT), ','.join(newAfterT)  #returning the new beforeT and the new afterT strings


def performDeletion(p, beforeT, afterT):
    #print("Deletion")
    #Choosing the source of the deletion
    before = True

    if beforeT == '':
        before = False

    elif afterT == '':
        before = True

    elif random.random() < 0.5: #equal chance if both sides have genes
        before = False
        
    if before:
        AAlist = beforeT.split(",")
    else:
        AAlist = afterT.split(",")

    delStart = int(random.random() * len(AAlist))

    delStop = min(geometricSampling(p)+delStart, len(AAlist))

    whatIsDeleted = AAlist[delStart:delStop]

    print("Deletion of " + ','.join(whatIsDeleted))

    deletedList = AAlist[:delStart] + AAlist[delStop:]

    if before:
        #print("beforeT : " + beforeT + " and a del of size " + str(delStop - delStart) + " at position " + str(delStart))
        #print("becomes : " + ','.join(deletedList))
        return ','.join(deletedList), afterT

    else:
        #print("afterT : " + afterT + " and a del of size " + str(delStop - delStart) + " at position " + str(delStart))
        #print("becomes : " + ','.join(deletedList))
        return beforeT, ','.join(deletedList)


def performDuplication(p, beforeT, afterT):
    #print("Duplication")
    beforeTList = beforeT.split(",")
    afterTList = afterT.split(",")

    #Choosing the source of the duplication
    sourceBeforeT = True

    if beforeT == '':
        sourceBeforeT = False

    elif afterT == '':
        sourceBeforeT = True

    elif random.random() < 0.5: #equal chance if both sides have genes
        sourceBeforeT = False
    
    if sourceBeforeT:
        dupStart = int(random.random() * len(beforeTList))
        dupStop = min(geometricSampling(p)+dupStart, len(beforeTList))
        dupSegment = beforeTList[dupStart:dupStop]

    else:
        dupStart = int(random.random() * len(afterTList))
        dupStop = min(geometricSampling(p)+dupStart, len(afterTList))
        dupSegment = afterTList[dupStart:dupStop]

    print("Duplication of " + ','.join(dupSegment))

    #Choosing the target of the duplication
    if random.random() < 0.5: #target is before T

        if sourceBeforeT:  #source was also before T
            pos = getPosOutsideOfRange(len(beforeTList), dupStart, dupStop)
            beforeTList = beforeTList[:pos] + dupSegment + beforeTList[pos:]

        else:  #source was after T
            pos = int(random.random() * len(beforeTList))
            if beforeTList == ['']:  #if it was empty
                beforeTList = dupSegment[::-1]  #reverse duplication
            else:
                beforeTList = beforeTList[:pos] + dupSegment[::-1] + beforeTList[pos:]  #reverse duplication

    else:  #target is after T

        if sourceBeforeT:  #source was before T
            pos = int(random.random() * len(afterTList))
            if afterTList == ['']: #if it was empty
                afterTList = dupSegment[::-1]  #reverse duplication
            else:
                afterTList = afterTList[:pos] + dupSegment[::-1] + afterTList[pos:]  #reverse duplication

        else:  #source was also after T
            pos = getPosOutsideOfRange(len(afterTList), dupStart, dupStop)
            afterTList = afterTList[:pos] + dupSegment + afterTList[pos:]

    #print(beforeT + ",[t]," + afterT)
    #print("Duplication of segment: " + ','.join(dupSegment) + " from sourceBeforeT = " + str(sourceBeforeT))
    #print("Result: " + ','.join(beforeTList) + ",[t]," +  ','.join(afterTList))

    return ','.join(beforeTList), ','.join(afterTList)

            
        
    

############
####MAIN####
############

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("USAGE: python levelCreator-v2.py mutableLength nbEvents p(geometric distribution param.) [nb of inversions]")
        sys.exit(0)

    else:
        mutableLength = int(sys.argv[1])
        nbEvents = int(sys.argv[2])
        p = float(sys.argv[3])

        nbInv = -1
        if len(sys.argv) == 5:
            nbInv = int(sys.argv[4])
            if nbInv > nbEvents:
                print("Error: nb of inversions is greater than the total nb of events to generate.")
                sys.exit(0)
                      

        mutableBeforeT = ""  #We are generating the mutable first, and generating the target after (to make sure that we don't have problems with deletions removing all the copies of a gene)
        mutableAfterT = ""

        for i in range(mutableLength):
            if i < mutableLength/2:
                mutableBeforeT += random.choice(aminoAcidsList)
                if i < mutableLength/2-1:
                    mutableBeforeT += ","
            else:
                mutableAfterT += random.choice(aminoAcidsList)
                if i < mutableLength-1:
                    mutableAfterT += ","

        #print(mutableBeforeT + "[t]," + mutableAfterT)

        #performInversion(p, mutableBeforeT, mutableAfterT)

        #performDeletion(p, mutableBeforeT, mutableAfterT)

        #performDuplication(p, mutableBeforeT, mutableAfterT)

        beforeT = mutableBeforeT
        afterT = mutableAfterT
        done = False #done with inversions or not
        for i in range(nbEvents):
            if beforeT == '' and afterT == '':
                print("WARNING: The genome is now empty, and there were " + str(nbEvents-i) + " events left to perform. Try again. Exiting...")
                sys.exit(0)
                
            rand = random.random()

            if not done:
                if nbEvents - i == nbInv: #we need inversions until the end
                    INV_PROB = 1; DUP_PROB = 0; DEL_PROB = 0;
                    #done = True
                    #print("New DUP_PROB = " + str(DUP_PROB) + " AND new DEL_PROB = " + str(DEL_PROB) + " AND new INV_PROB = " + str(INV_PROB))
                elif nbInv == 0: #we're done with inversions
                    DUP_PROB += INV_PROB/2; DEL_PROB += INV_PROB/2; INV_PROB = 0
                    done = True
                    #print("New DUP_PROB = " + str(DUP_PROB) + " AND new DEL_PROB = " + str(DEL_PROB) + " AND new INV_PROB = " + str(INV_PROB))     
            if rand < INV_PROB:
                beforeT, afterT = performInversion(p, beforeT, afterT)
                nbInv -= 1 #updating nbInv
            elif rand < INV_PROB + DEL_PROB:
                beforeT, afterT = performDeletion(p, beforeT, afterT)
            else:
                beforeT, afterT = performDuplication(p, beforeT, afterT)

           

        print(">target " + str(nbEvents)) 
        print(beforeT, end='')
        if beforeT == '':
            print("[t]", end='')
        else:
            print(",[t]", end='')
        if afterT != '':
            print("," + afterT)
        else:
            print("")
        print(">mutable")
        print(mutableBeforeT + ",[t]," + mutableAfterT)
